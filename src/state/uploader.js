import { decorate, observable, action, flow } from 'mobx';

import { S3Uploader } from '../util/s3-uploader.js';
import resolveWorkerError from '../util/resolve-worker-error.js';

const randomizeDelay = (delay = 30000, range = 5000) => {
	const low = delay - range;
	const random = Math.round(Math.random() * range * 2);
	return low + random;
};

const sleep = async(delay = 0) => {
	await new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, delay);
	});
};

let batch = 0;

async function monitorProgress(
	content,
	revision,
	progressCallback
) {
	/* eslint-disable no-invalid-this */
	let err;
	try {
		const progress = await this.apiClient.getWorkflowProgress({
			contentId: content.id,
			revisionId: revision.id
		});
		if (progress.didFail) {
			try {
				err = resolveWorkerError(
					JSON.parse(progress.details)
				);
			} catch (error) {
				err = resolveWorkerError(error);
			}

			progressCallback({
				contentId: content.id,
				revisionId: revision.id,
				error: err
			});
			try {
				await this.apiClient.deleteRevision({
					contentId: content.id,
					revisionId: revision.id
				});
			} catch (error) {
				// Catch the error to delete here so that it doesn't fall through
			}

			return;
		}

		progressCallback({
			contentId: content.id,
			revisionId: revision.id,
			percentComplete: progress.percentComplete,
			ready: progress.ready
		});
		if (progress.ready) {
			return;
		}
	} catch (error) {
		if (error.status && error.status === 404) {
			err = resolveWorkerError(error);
			progressCallback({
				contentId: content.id,
				revisionId: revision.id,
				error: err
			});
			return;
		}
	}

	await sleep(randomizeDelay(5000, 1000));
	await this.monitorProgress(content, revision, progressCallback);
	/* eslint-enable no-invalid-this */
}

async function uploadWorkflow({ file, extension }) {
	/* eslint-disable no-invalid-this */
	try {
		this.runningJobs += 1;
		const content = await this.apiClient.createContent();
		const revision = await this.apiClient.createRevision(
			content.id,
			{
				title: file.name,
				extension
			}
		);
		const uploader = new S3Uploader({
			file,
			key: revision.s3Key,
			signRequest: ({ file, key }) =>
				this.apiClient.signUploadRequest({
					fileName: key,
					contentType: file.type,
					contentDisposition: 'auto'
				}),
			onProgress: progress => {
				const upload = this.uploads.find(
					upload => upload.file === file
				);
				if (upload) {
					upload.progress = progress / 2;
				}
			}
		});
		await uploader.upload();
		await this.apiClient.processRevision({
			contentId: content.id,
			revisionId: revision.id
		});
		await this.monitorProgress(content, revision, ({ percentComplete = 0, error }) => {
			const upload = this.uploads.find(
				upload => upload.file === file
			);
			if (upload) {
				upload.progress = 50 + (percentComplete / 2);
				upload.error = error;
			}
		});
	} catch (error) {
		const upload = this.uploads.find(
			upload => upload.file === file
		);
		upload.error = resolveWorkerError(error);
	} finally {
		this.runningJobs -= 1;
		this.uploadsInProgress -= 1;
		if (this.queuedUploads.length > 0) {
			await this.uploadWorkflow(this.queuedUploads.shift());
		}
	}
	/* eslint-enable no-invalid-this */
}

export class Uploader {
	constructor({ apiClient }) {
		this.uploads = [];
		this.apiClient = apiClient;
		this.uploadsInProgress = 0;
		this.uploadConcurrency = 5;
		this.statusWindowVisible = false;
		this.queuedUploads = [];
		this.runningJobs = 0;
		this.uploadWorkflow = uploadWorkflow.bind(this);
		this.monitorProgress = monitorProgress.bind(this);

		this.uploadFile = flow(function * (file, batch) {
			/* eslint-disable no-invalid-this */
			const uploadInfo = { file, progress: 0, extension: file.name.split('.').pop(), err: null, batch };
			const getAllUploadsForBatch = this.uploads.filter(ui => ui.batch === batch) || [];
			getAllUploadsForBatch.push(uploadInfo);
			this.uploads.splice(0, getAllUploadsForBatch.length - 1, ...getAllUploadsForBatch);
			try {
				if (this.runningJobs < this.uploadConcurrency) {
					yield this.uploadWorkflow(uploadInfo);
				} else {
					this.queuedUploads.push(uploadInfo);
				}
			} catch (error) {
				const upload = this.uploads.find(
					upload => upload.file === uploadInfo.file
				);
				upload.error = resolveWorkerError(error);
			}
			/* eslint-enable no-invalid-this */
		});
	}

	uploadFiles(files) {
		batch += 1;
		for (const file of files) {
			this.uploadFile(file, batch);
		}

		if (files.length > 0) {
			this.statusWindowVisible = true;
		}
	}

	getUploads() {
		return this.uploads;
	}

	clearCompletedUploads() {
		this.uploads = this.uploads.filter(upload => upload.progress !== 100 && !upload.error);
	}

	showStatusWindow(show) {
		this.statusWindowVisible = show;
	}
}

decorate(Uploader, {
	uploads: observable,
	uploadsInProgress: observable,
	statusWindowVisible: observable,
	getUploads: action,
	showStatusWindow: action,
	uploadFile: action,
	uploadFiles: action,
	clearCompletedUploads: action
});

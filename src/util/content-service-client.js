import * as querystring from '@chaitin/querystring';
import auth from 'd2l-fetch-auth/src/unframed/index.js';
import { d2lfetch } from 'd2l-fetch/src/index.js';

d2lfetch.use({ name: 'auth', fn: auth });

export default class ContentServiceClient {
	constructor({ endpoint, tenantId }) {
		this.endpoint = endpoint;
		this.tenantId = tenantId;
	}

	_url(path, query) {
		const qs = query ? `?${querystring.stringify(query)}` : '';
		return `${this.endpoint}${path}${qs}`;
	}

	async _fetch({
		path,
		method = 'GET',
		query,
		body,
		extractJsonBody = true
	}) {
		const request = new Request(this._url(path, query), {
			method,
			...body && { body: JSON.stringify(body) }
		});

		const response = await d2lfetch.fetch(request);
		if (extractJsonBody) {
			try {
				return await response.json();
			} catch (error) {
				return { error: true };
			}
		}

		return response;
	}

	listContent({ ids = null } = {}) {
		return this._fetch({
			path: `/api/${this.tenantId}/content`,
			...ids && { queryParams: ids.join(',') }
		});
	}

	createContent(body) {
		return this._fetch({
			path: `/api/${this.tenantId}/content/`,
			method: 'POST',
			body
		});
	}

	createRevision(contentId, body) {
		return this._fetch({
			path: `/api/${this.tenantId}/content/${contentId}/revisions`,
			method: 'POST',
			body
		});
	}

	getUploadContext({
		contentId,
		revisionId
	}) {
		return this._fetch({
			path: `/api/${this.tenantId}/content/${contentId}/revisions/${revisionId}/upload/context`
		});
	}

	signUploadRequest({
		fileName,
		contentType,
		contentDisposition
	}) {
		return this._fetch({
			path: '/api/s3/sign',
			query: {
				fileName,
				contentType,
				contentDisposition
			}
		});
	}
}

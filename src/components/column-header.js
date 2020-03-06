import { css, html, LitElement } from 'lit-element/lit-element.js';

// Polyfills
import '@brightspace-ui/core/components/icons/icon.js';

class ColumnHeader extends LitElement {
	static get properties() {
		return {
			choices: { type: Array, attribute: false },
			groupName: { type: String, attribute: 'group' }
		};
	}

	static addToGroup(choiceNode, groupName) {
		this.group[groupName] = this.group[groupName] || [];
		this.group[groupName].push(choiceNode);
	}

	static onChangeSort(event) {
		const { groupName, sortKey } = event.detail;
		for (const choiceNode of this.group[groupName]) {
			if (choiceNode.sortKey !== sortKey) {
				choiceNode.setBooleanAttribute('current-sort', false);
			}
		}
	}

	constructor() {
		super();
		this.choiceNodes = [];
	}

	firstUpdated() {
		this.choiceNodes = this._getChoices();

		for (const choiceNode of this.choiceNodes) {
			choiceNode.groupName = this.groupName;
			ColumnHeader.addToGroup(choiceNode, this.groupName);
			choiceNode.addEventListener('change-sort', this.onChangeSort.bind(this));
		}

		if (this.choiceNodes.length === 1) {
			this.choiceNodes[0].setBooleanAttribute('current-choice', true);
		} else if (this.choiceNodes.length > 1) {
			// TODO: setup choice selection dropdown
		}
	}

	render() {
		return html`<slot></slot>`;
	}

	onChangeSort(event) {
		const { sortKey } = event.detail;
		for (const choiceNode of this.choiceNodes) {
			if (choiceNode.sortKey !== sortKey) {
				choiceNode.setBooleanAttribute('current-choice', false);
			}
		}

		ColumnHeader.onChangeSort(event);
	}

	_getChoices() {
		return this.shadowRoot.querySelector('slot').assignedNodes()
			.filter(node => node.nodeType === Node.ELEMENT_NODE &&
				node.nodeName === 'COLUMN-HEADER-CHOICE');
	}
}

ColumnHeader.group = {};

class ColumnHeaderChoice extends LitElement {
	static get properties() {
		return {
			currentChoice: { type: Boolean, attribute: 'current-choice', default: false },
			currentSort: { type: Boolean, attribute: 'current-sort', default: false },
			currentSortDesc: { type: Boolean, attribute: 'current-sort-desc', default: false },
			label: { type: String },
			sortKey: { type: String, attribute: 'sort-key' },
			sortDesc: { type: Boolean, attribute: 'sort-desc' }
		};
	}

	static get styles() {
		return [css`
			:host {
				display: none;
			}
			:host([current-choice]) {
				display: block;
			}
			.header-text {
				display: inline-block;
				cursor: pointer;
			}
			d2l-icon {
				display: none;
				margin-left: 0.5em;
				padding-bottom: 0.2em;
			}
			:host([current-sort]:not([current-sort-desc])) d2l-icon.up {
				display: inline-block;
			}
			:host([current-sort][current-sort-desc]) d2l-icon.down {
				display: inline-block;
			}
		`];
	}

	get sortQuery() {
		return `${this.sortKey}:${this.currentSortDesc ? 'desc' : 'asc'}`;
	}

	firstUpdated() {
		super.firstUpdated();
		this.defaultSortDesc = this.currentSortDesc;
		if (this.currentSort) {
			this.setBooleanAttribute('current-choice', true);
			this.dispatchEvent(this.changeSortEvent());
		}
	}

	render() {
		return html`
			<div class="header-text" @click=${this.toggleSort}>
				${this.label}
				<d2l-icon class="up" icon="tier1:chevron-up"></d2l-icon>
				<d2l-icon class="down" icon="tier1:chevron-down"></d2l-icon>
			</div>
		`;
	}

	toggleSort() {
		this.setBooleanAttribute('current-sort-desc',
			this.currentSort ? !this.currentSortDesc : this.defaultSortDesc);
		this.setBooleanAttribute('current-sort', true);
		this.dispatchEvent(this.changeSortEvent());
	}

	changeSortEvent() {
		return new CustomEvent('change-sort', {
			bubbles: true,
			composed: true,
			detail: {
				groupName: this.groupName,
				sortKey: this.sortKey,
				sortQuery: this.sortQuery
			}
		});
	}

	setBooleanAttribute(name, value) {
		if (value) {
			this.setAttribute(name, '');
		} else {
			this.removeAttribute(name);
		}
	}
}

window.customElements.define('column-header-choice', ColumnHeaderChoice);
window.customElements.define('column-header', ColumnHeader);

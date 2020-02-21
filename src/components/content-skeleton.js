import { LitElement, css, html } from 'lit-element';
import '@brightspace-ui/core/components/colors/colors.js';

class ContentSkeleton extends LitElement {
	static get properties() {
		return {
			maxWidth: { type: String, attribute: 'max-width' },
			width: { type: String, attribute: 'width' },
			height: { type: String, attribute: 'height' }
		};
	}

	static get styles() {
		return [css`
			.skeleton {
				border-radius: 4px;
				-webkit-animation: skeletonPulse 1.8s ease-in-out infinite alternate;
				animation: skeletonPulse 1.8s ease-in-out infinite alternate;
			}
			@-webkit-keyframes skeletonPulse {
				0%{background: var(--d2l-color-sylvite)}
				50%{background: var(--d2l-color-regolith)}
				100%{background: var(--d2l-color-sylvite)}
			}
			@keyframes skeletonPulse {
				0%{background: var(--d2l-color-sylvite)}
				50%{background: var(--d2l-color-regolith)}
				100%{background: var(--d2l-color-sylvite)}
			}
		`];
	}

	connectedCallback() {
		super.connectedCallback();
		const skeletonStyles = [
			`width: ${this.width}`,
			`height: ${this.height}`
		];
		if (this.maxWidth) {
			skeletonStyles.push(`max-width: ${this.maxWidth}`);
		}

		this.skeletonStyle = skeletonStyles.join('; ');
	}

	render() {
		return html`
			<div
				class="skeleton"
				style=${this.skeletonStyle}
			></div>`;
	}
}

window.customElements.define('content-skeleton', ContentSkeleton);

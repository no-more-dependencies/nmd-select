import HTMLParsedElement from "html-parsed-element";

const template = document.createRange().createContextualFragment(/*html*/`
<div>
	<input type="text" autocomplete="off">
	<select size="2" hidden tabindex="-1"></select>
	<span></span>
</div>`);

/**
 * @extends HTMLElement
 */
export default
class NmdSelect extends HTMLParsedElement {
	static get observedAttributes() {
		return ["id", "name", "required", "autofocus", "disabled", "form", "placeholder", "readonly", "input-class", "select-class"];
	}

	// #region Proxy getters and setters for the usual <select> stuff
	get value() {
		return this.selectElement.value;
	}

	set value(val) {
		this.selectElement.value = val;
		this.optionSelected();
	}

	get options() {
		return this.selectElement.options;
	}

	get selectedOptions() {
		return this.selectElement.selectedOptions;
	}

	get selectedIndex() {
		return this.selectElement.selectedIndex;
	}

	set selectedIndex(index) {
		this.selectElement.selectedIndex = index;
		this.optionSelected();
	}
	//#endregion

	attributeChangedCallback(name, oldValue, newValue) {
		if(!this.inputElement)
			return;

		if(name === "input-class"){
			this.inputElement.className = newValue;
			return;
		}

		if(name === "select-class"){
			this.selectElement.className = newValue;
			return;
		}

		// Observed attributes are passed to the input element.
		let target = this.inputElement;
		if(["name"].includes(name))
			target = this.selectElement;

		if(newValue === null)
			target.removeAttribute(name);
		else
			target.setAttribute(name, newValue);
	}

	_createSubDom(){
		// Use template
		let fragment = template.cloneNode(true);
		this.selectElement = fragment.querySelector("select");
		while (this.childNodes.length > 0) { // Append options into select in template.
			this.selectElement.appendChild(this.childNodes[0]);
		}
		this.appendChild(fragment);

		this.inputElement = this.querySelector("input");
		this.wrapperElement = this.querySelector("div");

		if(this.selectElement.selectedOptions[0])
			this.inputElement.value = this.selectElement.selectedOptions[0].text;

		// Process attributes because attributeChangedCallback was triggered before element was parsed.
		for(let attr of NmdSelect.observedAttributes)
			if(this.hasAttribute(attr))
				this.attributeChangedCallback(attr, null, this.getAttribute(attr));
	}

	_adoptSubDom(){
		this.selectElement = this.querySelector("select");
		this.inputElement = this.querySelector("input");
		this.wrapperElement = this.querySelector("div");
		this.optionSelected();
	}

	_createEventListeners(){
		// Filter options after input value changed.
		this.inputElement.addEventListener("input", (e) => {
			this.filterOptions(e.target.value);
		}, { passive: true });

		// Open select when something is typed.
		this.inputElement.addEventListener("keypress", () => {
			this.open();
		}, { passive: true });

		// Handle key events for browsing options.
		this.inputElement.addEventListener("keydown", (e) => {
			if(e.key == "ArrowDown"){
				this.open();
				if(this.selectElement.selectedIndex < this.selectElement.options.length - 1)
					this.selectElement.selectedIndex++;
				e.preventDefault();
			} else if(e.key === "ArrowUp"){
				this.open();
				if(this.selectElement.selectedIndex > 0)
					this.selectElement.selectedIndex--;
				e.preventDefault();
			} else if(e.key === "Enter"){
				// Select highlighted value and close.
				this.optionSelected();
				this.close();
				e.preventDefault();
			}
		});

		// Prevent label click when element is wrapped in <label>.
		this.wrapperElement.addEventListener("click", (e) => {
			e.preventDefault();
		});

		// Open/close select on mousedown (just like vanilla select).
		this.wrapperElement.addEventListener("mousedown", (e) => {
			if(this.isOpen){
				if(e.target.tagName === "OPTION"){
					e.target.selected = true;
					this.optionSelected();
					this.close();
				} else if(e.target.tagName === "SPAN" && this.isOpen) {
					this.close();
				} else // This should happen when scroll bar is clicked
					this.ignoreBlur = true;
			} else {
				this.open();
				// Click causes focus loss. Setting this boolean makes blur listener ignore one event.
				this.ignoreBlur = true;
			}

			// After focus juggling, give focus back to input element and reset ignoreBlur, because blur may have not been triggered.
			window.addEventListener("mouseup", () => {
				this.inputElement.select();
				this.ignoreBlur = false;
			}, {
				passive: true,
				once: true
			});
		}, { passive: true });

		// Close select on focus loss.
		this.inputElement.addEventListener("blur", (e) => {
			if(this.ignoreBlur){ // 
				this.ignoreBlur = false;
				return;
			}
			this.close();
		}, { passive: true });
	}

	parsedCallback() {
		if(this.children.length !== 1 || this.firstElementChild.tagName !== "DIV"){
			this._createSubDom();
		} else {
			this._adoptSubDom();
		}
		this._createEventListeners();
	}

	get isOpen() {
		return !this.selectElement.hidden;
	}

	/**
	 * Opens select options.
	 * You probably shouldn't run this directly.
	 */
	open() {
		if(this.inputElement.disabled || this.inputElement.readOnly)
			return;
		if(this.isOpen)
			return;
		this.selectElement.hidden = false;
		this.filterOptions("");
		this.selectValue();
		this.positionOptions();
	}

	/**
	 * Opens select options.
	 * You probably shouldn't run this directly.
	 */
	close() {
		if(!this.isOpen)
			return;
		this.selectElement.hidden = true;
		this.selectValue(true);
	}

	/**
	 * After option is selected, puts coresponding text into input element.
	 * You probably shouldn't run this directly.
	 */
	optionSelected() {
		if(this.selectElement.selectedOptions.length > 0){
			this.inputElement.value = this.selectElement.selectedOptions[0].text;
		} else {
			this.inputElement.value = "";
			this.selectElement.value = "";
		}
	}

	/**
	 * Position options on screen (up, down, max height).
	 * You probably shouldn't run this directly.
	 */
	positionOptions(){
		/** @type {DOMRect} */
		let rect = this.getBoundingClientRect();
		this.selectElement.style.bottom = "";
		this.selectElement.style.maxHeight = "";
		let spaceAbove = rect.top;
		let spaceBelow = window.innerHeight - rect.bottom;
		let maxWidth = window.innerWidth - rect.left;
		this.selectElement.style.maxWidth = `${maxWidth}px`;
		if(spaceBelow < this.selectElement.offsetHeight) {
			if(spaceAbove >= spaceBelow) {
				this.selectElement.style.bottom = rect.height + "px";
				this.selectElement.style.maxHeight = spaceAbove + "px";
			} else
				this.selectElement.style.maxHeight = spaceBelow + "px";
		}
	}

	/**
	 * Hides options that do not match searched string. @see testMatch
	 * You probably shouldn't run this directly.
	 * @param {string}
	 */
	filterOptions(search){
		let count = 0;
		let firstMatchSelected = false;
		for(let entry of this.selectElement.children){
			if(entry instanceof HTMLOptGroupElement){
				let somethingVisible = false;
				for(let opt of entry.children){
					somethingVisible = this.updateOptionVisibility(entry, opt, search) || somethingVisible;
					count += somethingVisible;
					if(!firstMatchSelected && somethingVisible){
						opt.selected = true;
						firstMatchSelected = true;
					}
				}
				entry.hidden = !somethingVisible;
				count += somethingVisible;
			} else if(entry instanceof HTMLOptionElement) {
				count += this.updateOptionVisibility(null, entry, search);
			}
		}
		let size = Math.max(count, 2);
		let maxSize = this.getAttribute("max-size");
		if(maxSize)
			size = Math.min(size, maxSize);
		this.selectElement.size = size;
	}

	/**
	 * Selects option which text exactly matches with value of input element.
	 * You probably shouldn't run this directly.
	 * @param {boolean} clearValue - Clear value in input element if no matching option found.
	 */
	selectValue(clearValue){
		for(let option of this.selectElement.options) {
			if(option.text === this.inputElement.value) {
				option.selected = true;
				return;
			}
		}
		this.selectElement.value = "";
		if(clearValue)
			this.inputElement.value = "";
	}

	/**
	 * Updates passed option's visibility based on search string. @see testMatch
	 * You probably shouldn't run this directly.
	 * @param {?HTMLOptGroupElement} group 
	 * @param {HTMLOptionElement} option 
	 * @param {string} search 
	 */
	updateOptionVisibility(group, option, search){
		if(
			option instanceof HTMLOptionElement && 
			(search.length == 0 || this.testMatch(option.text, search) || group && this.testMatch(group.label, search))
		){
			option.hidden = false;
			return true;
		} else
			option.hidden = true;
		return false;
	}

	/**
	 * @param {string} text 
	 * @param {string} search 
	 * @returns {boolean} True if text contains search (case insensitive).
	 */
	testMatch(text, search){
		text = text.toLocaleLowerCase();
		search = search.toLocaleLowerCase();
		let parts = search.split(" ")
		return parts.every(p => text.indexOf(p) >= 0);
	}
}
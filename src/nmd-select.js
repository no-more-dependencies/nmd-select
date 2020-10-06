const template = /*html*/`
<input type="text">
<select size="5" hidden tabindex="-1">
	<optgroup label="Swedish Cars">
		<option value="volvo">Volvo</option>
		<option value="saab">Saab</option>
	</optgroup>
	<optgroup label="German Cars">
		<option value="mercedes">Mercedes</option>
		<option value="audi">Audi</option>
	</optgroup>
	<optgroup label="Other">
		<option value="vaux">Vauxhalle</option>
		<option value="vololo">Vololo</option>
	</optgroup>
</select>`;

class NmdSelect extends HTMLElement {
	constructor(){
		super();
	}

	connectedCallback(){
		this.innerHTML = template;

		this.inputElement = this.querySelector("input");
		this.selectElement = this.querySelector("select");

		this.inputElement.addEventListener("input", (e) => {
			this.filterOptions(e.target.value);
		});

		this.inputElement.addEventListener("keydown", (e) => {
			if(e.keyCode == 40){ // ArrowDown
				if(this.selectElement.selectedIndex < this.selectElement.options.length - 1)
					this.selectElement.selectedIndex++;
				e.preventDefault();
			} else if(e.keyCode == 38){ // ArrowUp
				if(this.selectElement.selectedIndex > 0)
					this.selectElement.selectedIndex--;
				e.preventDefault();
			} else if(e.keyCode == 13){ // Enter
				this.focus();
			}
		});

		this.inputElement.addEventListener("focus", (e) => {
			this.selectElement.hidden = false;
		});

		this.inputElement.addEventListener("blur", (e) => {
			this.selectElement.hidden = true;
			if(this.selectElement.selectedOptions.length > 0)
				this.inputElement.value = this.selectElement.selectedOptions[0].text;
			else
				this.inputElement.value = "";
		});
	}

	filterOptions(search){
		let count = 0;
		let firstMatchSelected = false;
		for(let entry of this.selectElement.children){
			if(entry instanceof HTMLOptGroupElement){
				let somethingVisible = false;
				for(let opt of entry.children){
					somethingVisible = this.updateOptionVisibility(opt, search) || somethingVisible;
					count += somethingVisible;
					if(!firstMatchSelected && somethingVisible){
						opt.selected = true;
						firstMatchSelected = true;
					}
				}
				entry.hidden = !somethingVisible;
				count += somethingVisible;
			} else if(entry instanceof HTMLOptionElement)
				this.updateOptionVisibility(entry, search);
		}
		this.selectElement.size = Math.max(count, 2);
	}

	updateOptionVisibility(option, search){
		if(
			option instanceof HTMLOptionElement && 
			(search.length == 0 || this.testMatch(option.text, search))
		){
			option.hidden = false;
			return true;
		} else
			option.hidden = true;
		return false;
	}

	testMatch(text, search){
		text = text.toLocaleLowerCase();
		search = search.toLocaleLowerCase();
		return text.indexOf(search) >= 0;
	}
}
customElements.define("nmd-select", NmdSelect);
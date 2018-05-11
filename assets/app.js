window.addEventListener('load', () => {
	const els = document.querySelectorAll('article');
	const len = els.length;
	let curr = 0;
	let prev = curr;

	els[curr].classList.toggle('show');

	if (len === 0) {
		return;
	}

	document.querySelector('.next').addEventListener('click', () => {
		if (curr < len-1){
			curr++;
		} else {
			curr = 0;
		}
		els[curr].classList.toggle('show');
		els[prev].classList.toggle('show');
		prev = curr;
	});
});

window.addEventListener('load', () => {
	const els = document.querySelectorAll('article');
	const len = els.length;

	els[0].classList.toggle('show');

	if (len === 0) {
		return;
	}

	for (const el of els) {
		el.addEventListener('click', () => {
			el.classList.remove('show');
			const nextEl = el.nextElementSibling;
			if (nextEl !== null) {
				nextEl.classList.toggle('show');
			} else {
				els[0].classList.toggle('show');
			}
		});
	}
});

'use strict'

window.addEventListener('load', () => {

    const carousels = document.querySelectorAll('.carousel')

    if (carousels) {
        for (const carousel of carousels) {

            const init = () => {
                const titleEls = carousel.querySelectorAll('.slide-price--title')
                if (titleEls) titleEls.forEach((el) => el.setAttribute('title', el.innerText))
            }

            init()

        }
    }

})
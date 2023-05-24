'use strict'

window.addEventListener('load', () => {

    const sliders = document.querySelectorAll('.swiffy-slider')
    if (!sliders) return // no sliders on page

    for (const slider of sliders) {

        const disableObservers = slider.hasAttribute('data-disable-observers')
        if (disableObservers) continue // disable observers for this slider

        const buttons = slider.querySelectorAll('.slider-nav')
        if (!buttons) continue // no nav buttons

        const resizeObserver = new ResizeObserver(() => {
            updateNavigationButtons()
            return
        });
        resizeObserver.observe(slider);

        const mutationObserver = new MutationObserver((mutations) => {
            if (mutations[0].type === "attributes") {
                updateNavigationButtons()
                return
            }
        })
        mutationObserver.observe(slider, { attributes: true })

        const updateNavigationButtons = () => {
            const slideCount = slider.querySelectorAll('.slide').length || 0
            const slidesVisible = slider.querySelectorAll('.slide.slide-visible').length || 0

            if (slidesVisible < slideCount) {
                buttons.forEach((button) => button.classList.add('visible'))
            } else {
                buttons.forEach((button) => button.classList.remove('visible'))
            }
        }

        updateNavigationButtons()
    }
})

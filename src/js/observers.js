'use strict'

/**
 * Initialized observers for navigation buttons
 * @param {object} sliders - All sliders on the page
 */
const initObservers = (sliders) => {

    if (!sliders) return // no sliders on page, no observers required

    for (const slider of sliders) {

        const disableObservers = slider.hasAttribute('data-disable-observers')
        if (disableObservers) continue // disable observers for this slider

        const buttons = slider.querySelectorAll('.swiffy-slider .slider-nav')
        if (!buttons) continue // no nav buttons, no observers required

        const resizeObserver = new ResizeObserver(() => {
            // console.log('ResizeObserver')
            updateNavigationButtons()
            return // exit after first resize event
        });
        resizeObserver.observe(slider);

        const mutationObserver = new MutationObserver((mutations) => {
            if (mutations[0].type === "attributes") {
                // console.log('MutationObserver')
                updateNavigationButtons()
                return // exit after first mutation event
            }
        })
        mutationObserver.observe(slider, { attributes: true })

        const updateNavigationButtons = () => {
            const slideCount = slider.querySelectorAll('.slide').length || 0
            const slidesVisible = slider.querySelectorAll('.slide.slide-visible').length || 0
            // console.log(slideCount, slidesVisible)

            if (slidesVisible < slideCount) {
                buttons.forEach((button) => button.classList.add('visible'))
            } else {
                buttons.forEach((button) => button.classList.remove('visible'))
            }
        }

        updateNavigationButtons()
    }
}

export default initObservers
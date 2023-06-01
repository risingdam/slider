'use strict'

/**
 * Initialized observers for navigation buttons
 * @param {object} sliders - All sliders on the page
 */
const initObservers = (sliders) => {

    if (!sliders) return

    for (const slider of sliders) {

        const disableObservers = slider.hasAttribute('data-disable-observers')
        if (disableObservers) continue

        const buttons = slider.querySelectorAll('.swiffy-slider .slider-nav')
        if (!buttons) continue

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
}

export default initObservers

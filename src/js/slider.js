'use strict'

import handleZoom from './zoom'
import initObservers from './observers'
import { swiffyslider } from 'swiffy-slider'

let state = {
    initKeydownListener: false,
    initEscapeKeyListener: false,
    currentSlider: null,
    activeSlide: 0
}

/**
 * Creates a new DOM element with one or more classes
 * @param {string} element - Element tagname
 * @param {string|string array} classList - Element class(es)
 */
const newElement = (element, classList) => {
    const newEl = document.createElement(element)
    if (typeof classList === 'string') {
        newEl.classList.add(classList)
    } else {
        newEl.classList.add(...classList)
    }
    return newEl
}

/**
 * Initializes keyboard navigation for sliders once
 * @param {object} sliderEl - The slider root element
 */
const initKeyboardNav = (sliderEl) => {

    state.currentSlider = sliderEl
    if (state.initKeydownListener) return

    window.addEventListener('keydown', (event) => {

        /* only handle keydown events if target is
            document.body and no other element has focus */
        if (event.srcElement !== document.body) return

        const key = event.key
        const altKey = event.altKey
        const code = event.which

        if (key === 'ArrowRight' || key === 'PageDown') { // go to next slide

            event.preventDefault()
            swiffyslider.slide(state.currentSlider, true)

        } else if (key === 'ArrowLeft' || key === 'PageUp') { // go to previous slide

            event.preventDefault()
            swiffyslider.slide(state.currentSlider, false)

        } else if (key === 'ArrowUp' || key === 'Home') { // go to first slide

            event.preventDefault()
            swiffyslider.slideTo(state.currentSlider, 0)

        } else if (key === 'ArrowDown' || key === 'End') { // go to last slide

            event.preventDefault()
            const slideCount = state.currentSlider.querySelectorAll('.slide').length
            if (slideCount) swiffyslider.slideTo(state.currentSlider, slideCount)

        } else if (code >= 96 && code <= 105) { // go to slide 1-10 using numpad 0-9 keys

            event.preventDefault()
            swiffyslider.slideTo(state.currentSlider, event.which - 96)

        } else if (code >= 48 && code <= 57) { // go to slide 1-10 using digit 0-9 keys

            event.preventDefault()
            swiffyslider.slideTo(state.currentSlider, event.which - 48)

        } else if (code === 70 && altKey) { // go to fullscreen with Alt-F

            event.preventDefault()
            const buttonEnlarge = state.currentSlider.querySelector('.action.enlarge')
            if (buttonEnlarge) buttonEnlarge.click()

        } else if (code === 90 && altKey) { // go to zoom-in with Alt-Z

            event.preventDefault()
            const buttonZoom = state.currentSlider.querySelector('.action.zoom-in')
            if (buttonZoom) buttonZoom.click()

        }
    })

    state.initKeydownListener = true
}

/**
 * Initializes keyboard navigationto close fullscreen view
 * @param {object} fullscreenElement - The slider root element
 */
const initEscapeKey = (fullscreenElement) => {

    if (state.initEscapeKeyListener) return

    window.addEventListener('keydown', (event) => {
        if (event.srcElement === document.body) {
            if (event.key === 'Escape') {
                if (document.body.classList.contains('fullscreen')) {
                    const buttonClose = fullscreenElement.querySelector('.action.close')
                    if (buttonClose) buttonClose.click()
                }
            }
        }
    })

    state.initEscapeKeyListener = true
}

/**
 * Handles exit from fullscreen view when OS fullscreen view is closed
 * @param {object} fullscreenElement - Source element for fullscreen view
 */
const initFullscreenChange = (fullscreenElement) => {
    document.body.onfullscreenchange = () => { // bug: addEventListener method kills tab in Chrome
        if (window.screen.availHeight !== window.innerHeight || window.screen.availWidth !== window.innerWidth) {
            const buttonClose = fullscreenElement.querySelector('.action.close')
            if (buttonClose) buttonClose.click()
        }
    }
}

/**
 * Initializes slider indicators
 * @param {object} slider - The swiffy slider element
 */
const initIndicators = (slider) => {

    const sliderIndicators = slider.querySelector('.slider-indicators')
    if (!sliderIndicators) return

    const slideCount = slider.querySelectorAll('.slide').length
    if (!slideCount) return

    for (let i = 0; i < slideCount; i++) {
        const button = newElement('button', 'indicator')
        if (i === 0) button.classList.add('active')
        sliderIndicators.appendChild(button)
    }

    sliderIndicators.classList.add('visible')
}

/**
 * Initializes fullscreen view on click by cloning source slider
 * @param {object} slider - The slider root element
 * @param {object} sliderEl - The swiffy slider element
 */
const initFullScreen = async (slider, sliderEl, containerClass) => {

    const buttonEnlarge = slider.querySelector('.action.enlarge')
    if (!buttonEnlarge) return // exit

    await buttonEnlarge.addEventListener('click', async () => {

        // create DOM elements
        const fullscreenSliderDiv = newElement('div', ['container', containerClass, 'fullscreen'])
        const rowEl = newElement('div', 'row')
        const columnEl = newElement('div', ['column', 'slider'])
        const buttonClose = newElement('button', ['action', 'close'])
        const tooltip = newElement('span', ['tooltip', 'tooltip--bottom', 'tooltip--fade-in'])
        tooltip.innerText = 'Close'

        // clone thumbnails
        const thumbnails = slider.querySelector('.slider-thumbnails')
        if (thumbnails) {
            columnEl.appendChild(thumbnails.cloneNode(true))
        }

        // clone wrapper with slider and navigation
        const wrapper = slider.querySelector('.slider-wrapper')
        if (wrapper) {
            columnEl.appendChild(wrapper.cloneNode(true))
        }

        // add elements to DOM
        rowEl.appendChild(columnEl)
        fullscreenSliderDiv.appendChild(rowEl)
        buttonClose.appendChild(tooltip)
        fullscreenSliderDiv.appendChild(buttonClose)
        document.body.appendChild(fullscreenSliderDiv)

        // init cloned slider functionality
        const fullscreenSliderEl = fullscreenSliderDiv.querySelector('.swiffy-slider')
        fullscreenSliderEl.classList.remove('slider-nav-mousedrag'); // bug: mousedrag does not work on a clone
        const enableKeyboardNav = fullscreenSliderEl.hasAttribute('data-enable-keyboard-nav')
        const fullscreenElement = document.querySelector('.container.' + containerClass + '.fullscreen')
        const enableZoom = fullscreenSliderEl.hasAttribute('data-enable-zoom')

        if (thumbnails) {
            initThumbnails(fullscreenSliderDiv, fullscreenSliderEl)
        }

        swiffyslider.initSlider(fullscreenSliderEl)
        swiffyslider.slideTo(fullscreenSliderEl, state.activeSlide ? state.activeSlide : 0)

        document.body.classList.add('fullscreen')

        // enable OS fullscreen view if available
        if (document.fullscreenEnabled) {
            if (!document.fullscreenElement) {
                await fullscreenElement.requestFullscreen()
            } else {
                document.exitFullscreen()
            }
        }

        if (enableKeyboardNav) {
            initKeyboardNav(fullscreenSliderEl)
        }

        // set active slide and focus on original slider
        buttonClose.addEventListener('click', () => {
            if (document.fullscreenEnabled && document.fullscreenElement) {
                document.exitFullscreen()
            }
            swiffyslider.slideTo(sliderEl, state.activeSlide ? state.activeSlide : 0)
            fullscreenSliderDiv.remove()
            if (enableKeyboardNav) {
                initKeyboardNav(sliderEl)
            }
            document.body.classList.remove('fullscreen', 'disable-touch')
        })

        initEscapeKey(fullscreenElement)
        initFullscreenChange(fullscreenElement)

        if (enableZoom) {
            initZoom(fullscreenElement, fullscreenSliderEl)
        }
    })

    buttonEnlarge.classList.add('visible')
}

/**
 * Initializes thumbnails and slider navigation sync
 * @param {object} slider - The slider root element
 * @param {object} sliderEl - the swiffy slider element
 */
const initThumbnails = (slider, sliderEl) => {

    const thumbnailLoadCount = sliderEl.hasAttribute('data-thumbnail-load')
    const thumbnailsContainer = slider.querySelector('.slider-thumbnails ul')
    if (!thumbnailsContainer) return
    const thumbnails = thumbnailsContainer.querySelectorAll('li')

    let thumbnailsToShow = 2
    if (thumbnailLoadCount) {
        const thumbnailCount = parseInt(sliderEl.getAttribute('data-thumbnail-load'))
        if (thumbnailCount >= thumbnailsToShow) thumbnailsToShow = thumbnailCount;
    }

    swiffyslider.onSlideEnd(slider, () => {

        const slides = slider.querySelectorAll('.slider-container li')

        // loop through slides and match state with thumbnails
        for (const [i, slide] of Array.from(slides).entries()) {

            thumbnails[i].classList.remove('active')

            if (slide.classList.contains('slide-visible')) {
                thumbnails[i].classList.add('active')
                state.activeSlide = i

                // reveal remaining thumbnails
                if (thumbnailsToShow !== 0 && i >= thumbnailsToShow - 1) {
                    thumbnails[i].removeAttribute('data-count')
                    thumbnails.forEach(thumbnail => {
                        thumbnail.classList.add('visible')
                    })
                }

                thumbnails[i].parentNode.scrollTop = thumbnails[i].offsetTop

                if (thumbnailsToShow !== 0 && i >= thumbnailsToShow - 1) {
                    thumbnails[i].parentNode.classList.add('scroll')
                }

            }
        }
    }, 25)

    // loop through thumbnails and match state with slides
    for (const [i, el] of Array.from(thumbnails).entries()) {

        // make first thumbnail active
        if (i === 0) el.classList.add('active')

        // if no initial set, display all thumbnails
        if (!thumbnailsToShow) {
            el.classList.add('visible')
            el.removeAttribute('data-count')
        }

        // display initial set of thumbnails
        if (i < thumbnailsToShow) {
            el.classList.add('visible')
        }

        // set remaining count on last thumbnail to show initially
        if (i + 1 === thumbnailsToShow && thumbnails.length !== thumbnailsToShow) {
            el.setAttribute('data-count', '+' + (thumbnails.length - thumbnailsToShow))
        }

        // navigate to slide
        el.addEventListener('click', () => {

            // reveal remaining thumbnails
            if (i + 1 === thumbnailsToShow) {
                for (const el of thumbnails) {
                    el.classList.add('visible')
                    el.removeAttribute('data-count')
                }
            }

            swiffyslider.slideTo(slider, i)
            state.activeSlide = i
        })

    }

    // make thumbnail list scrollable
    if (!thumbnailsToShow) {
        thumbnailsContainer.classList.add('scroll')
    }
}

/**
 * Initializes zoom function
 * @param {object} slider - The slider root element
 * @param {object} sliderEl - the swiffy slider element
 */
const initZoom = (slider, sliderEl) => {

    const buttonZoom = slider.querySelector('.action.zoom-in')
    if (!buttonZoom) return

    buttonZoom.addEventListener('click', () => {

        const zoomActive = buttonZoom.classList.contains('zoom-out')

        if (zoomActive) {
            buttonZoom.classList.remove('zoom-out')
            const canvas = slider.querySelector('.image-pan.image-zoom')
            canvas.remove() // remove canvas element from DOM after usage
        } else {
            const currentSlide = sliderEl.querySelector('.slide-visible img')
            handleZoom(slider, currentSlide.src);
            buttonZoom.classList.add('zoom-out')
        }

    })

    buttonZoom.classList.add('visible')
}

/**
 * Initializes all sliders on page
 */
const initSliders = () => {

    const sliders = document.querySelectorAll('.slider')
    if (!sliders) return

    for (const slider of sliders) {

        const sliderEl = slider.querySelector('.swiffy-slider')
        if (!sliderEl) continue // we only initialize swiffy-slider elements

        const enableIndicators = sliderEl.hasAttribute('data-enable-indicators')
        const hasThumbnails = slider.querySelector('.slider-thumbnails')
        const enableZoom = sliderEl.hasAttribute('data-enable-zoom')
        const enableFullScreen = sliderEl.hasAttribute('data-enable-fullscreen')
        const enableKeyboardNav = sliderEl.hasAttribute('data-enable-keyboard-nav')
        const containerClass = sliderEl.getAttribute('data-container-class')

        if (enableIndicators) {
            initIndicators(sliderEl)
        }

        if (hasThumbnails) {
            initThumbnails(slider, sliderEl)
        }

        if (enableZoom) {
            initZoom(slider, sliderEl)
        }

        if (enableFullScreen) {
            initFullScreen(slider, sliderEl, containerClass)
        }

        if (enableKeyboardNav) {
            initKeyboardNav(sliderEl)
        }

        swiffyslider.initSlider(sliderEl)
    }

    const timeout = setTimeout(() => {
        initObservers(sliders)
        clearTimeout(timeout)
    }, 500)
}

window.swiffyslider = swiffyslider
initSliders()

export default newElement

# Slider

A gallery and carousel slider implementation based on swiffyslider.
Examples based on sliders used in the JMP rebuild project.

## Gallery

* A vertial thumbnail list on the left
* Price box on the right
* Details below the gallery
* A fullscreen and zoom-in option with key commands (Alt-Z and Alt-F)
* The fullscreen option uses the OS fullscreen view if allowed
* The zoom-in option uses a 2d cancas element for GPU performance
* Keyboard navigation with arrow keys, home, end and page up/down keys
* Uses modern CSS and lightweight JavaScript
* Thumbnails and slider navigation synchronized
* Slider navigation animation

Link: [gallery.html](gallery.html)

## Carousel

* Horizontal slider with 2 slides on mobile, 4 on tablet and 6 on desktop
* Fullscreen option and keyboard navigation optional
* With product details such as title, price and cta
* Uses lightweight JavaScript observers to enable/disable slider navigation based on number of slides and visible slides
* Slider navigation and product links animation

Link: [carousel.html](carousel.html)

## Color variants

* Horizontal slider with 6 slides on mobile, tablet and desktop (css override)
* Uses lightweight JavaScript observers to enable/disable slider navigation based on number of slides and visible slides
* Slider navigation and product links animation

Link: [color-variants.html](color-variants.html)

### Build scripts

* Less to css bundle with `npm run watch`
* JavaScript to js bundle with `npm run watch-js`


(() => {
  // src/js/zoom.js
  var trackTransforms = (context) => {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let xform = svg.createSVGMatrix();
    context.getTransform = () => {
      return xform;
    };
    let savedTransforms = [];
    let save = context.save;
    context.save = () => {
      savedTransforms.push(xform.translate(0, 0));
      return save.call(context);
    };
    let restore = context.restore;
    context.restore = () => {
      xform = savedTransforms.pop();
      return restore.call(context);
    };
    let scale = context.scale;
    context.scale = (sx, sy) => {
      xform = xform.scaleNonUniform(sx, sy);
      return scale.call(context, sx, sy);
    };
    let rotate = context.rotate;
    context.rotate = (radians) => {
      xform = xform.rotate(radians * 180 / Math.PI);
      return rotate.call(context, radians);
    };
    let translate = context.translate;
    context.translate = (dx, dy) => {
      xform = xform.translate(dx, dy);
      return translate.call(context, dx, dy);
    };
    let transform = context.transform;
    context.transform = (a, b, c, d, e, f) => {
      let matrix = svg.createSVGMatrix();
      matrix.a = a;
      matrix.b = b;
      matrix.c = c;
      matrix.d = d;
      matrix.e = e;
      matrix.f = f;
      xform = xform.multiply(matrix);
      return transform.call(context, a, b, c, d, e, f);
    };
    let setTransform = context.setTransform;
    context.setTransform = (a, b, c, d, e, f) => {
      xform.a = a;
      xform.b = b;
      xform.c = c;
      xform.d = d;
      xform.e = e;
      xform.f = f;
      return setTransform.call(context, a, b, c, d, e, f);
    };
    let pt = svg.createSVGPoint();
    context.transformedPoint = (x, y) => {
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(xform.inverse());
    };
  };
  var handleZoom = async (slider, imageSource) => {
    if (!slider || !imageSource)
      return;
    let canvas = slider_default("canvas", ["image-pan", "image-zoom"]);
    let wrapper = slider.querySelector(".slider-wrapper");
    wrapper.prepend(canvas);
    if (!canvas)
      return;
    canvas.width = canvas.scrollWidth;
    canvas.height = canvas.scrollHeight;
    let image = new Image();
    image.src = imageSource;
    await image.decode();
    let context = canvas.getContext("2d");
    trackTransforms(context);
    const redraw = () => {
      let p1 = context.transformedPoint(0, 0);
      let p2 = context.transformedPoint(canvas.width, canvas.height);
      context.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
      const factor = Math.min(canvas.width / image.width, canvas.height / image.height);
      context.scale(factor, factor);
      context.drawImage(image, canvas.width - image.width * factor, canvas.height - image.height * factor);
      context.scale(1 / factor, 1 / factor);
    };
    redraw();
    let lastX = canvas.width / 2;
    let lastY = canvas.height / 2;
    let dragStart, dragged;
    canvas.classList.add("visible");
    document.body.classList.add("disable-touch");
    canvas.addEventListener("mousedown", (event) => {
      lastX = event.offsetX || event.pageX - canvas.offsetLeft;
      lastY = event.offsetY || event.pageY - canvas.offsetTop;
      canvas.style.cursor = canvas.style.cursor !== "grabbing" && "grabbing";
      dragStart = context.transformedPoint(lastX, lastY);
      dragged = false;
    }, { passive: false });
    canvas.addEventListener("mousemove", (event) => {
      lastX = event.offsetX || event.pageX - canvas.offsetLeft;
      lastY = event.offsetY || event.pageY - canvas.offsetTop;
      dragged = true;
      if (dragStart) {
        let pt = context.transformedPoint(lastX, lastY);
        context.translate(pt.x - dragStart.x, pt.y - dragStart.y);
        redraw();
      }
    }, { passive: false });
    canvas.addEventListener("mouseup", (event) => {
      dragStart = null;
      canvas.style.cursor = canvas.style.cursor !== "grab" && "grab";
      if (!dragged)
        zoom(event.shiftKey ? 1 : -1);
    }, { passive: false });
    canvas.addEventListener("touchstart", (event) => {
      const mousePos = getTouchPos(canvas, event);
      const mouseEvent = new MouseEvent("mousedown", {
        clientX: mousePos.x,
        clientY: mousePos.y
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
    canvas.addEventListener("touchmove", (event) => {
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: true });
    canvas.addEventListener("touchend", () => {
      const mouseEvent = new MouseEvent("mouseup", {});
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
    const getTouchPos = (canvasDom, touchEvent) => {
      var rect = canvasDom.getBoundingClientRect();
      return {
        x: touchEvent.touches[0].clientX - rect.left,
        y: touchEvent.touches[0].clientY - rect.top
      };
    };
    let zoom = (delta) => {
      let pt = context.transformedPoint(lastX, lastY);
      context.translate(pt.x, pt.y);
      let xform = context.getTransform();
      let a = xform.a;
      let b = xform.b;
      let c = xform.c;
      let d = xform.d;
      let e = xform.e;
      let f = xform.f;
      if (a <= 0.1) {
        a = 0.1;
        d = 0.1;
      } else if (a >= 3) {
        a = 3;
        d = 3;
      }
      context.setTransform(a, b, c, d, e, f);
      let factor = Math.pow(0.5, delta);
      if (a >= 0.1 || a <= 3) {
        context.scale(factor, factor);
      } else {
        context.scale(0, 0);
      }
      context.translate(-pt.x, -pt.y);
      redraw();
    };
    const handleScroll = (event) => {
      event.preventDefault();
      const delta = event.wheelDelta ? event.wheelDelta / 1500 : event.detail ? -event.detail : 0;
      if (delta)
        zoom(delta);
    };
    canvas.addEventListener("wheel", handleScroll, { passive: false });
    const resizeObserver = new ResizeObserver(() => {
      updateCanvas(canvas);
      return;
    });
    resizeObserver.observe(slider);
    const updateCanvas = (canvas2) => {
      canvas2.width = canvas2.scrollWidth;
      canvas2.height = canvas2.scrollHeight;
      redraw();
    };
  };
  var zoom_default = handleZoom;

  // node_modules/swiffy-slider/src/swiffy-slider.esm.js
  var swiffyslider = function() {
    return {
      version: "1.6.0",
      init(rootElement = document.body) {
        for (let sliderElement of rootElement.querySelectorAll(".swiffy-slider")) {
          this.initSlider(sliderElement);
        }
      },
      initSlider(sliderElement) {
        for (let navElement of sliderElement.querySelectorAll(".slider-nav")) {
          let next = navElement.classList.contains("slider-nav-next");
          navElement.addEventListener("click", () => this.slide(sliderElement, next), { passive: true });
        }
        for (let indicatorElement of sliderElement.querySelectorAll(".slider-indicators")) {
          indicatorElement.addEventListener("click", () => this.slideToByIndicator());
          this.onSlideEnd(sliderElement, () => this.handleIndicators(sliderElement), 60);
        }
        if (sliderElement.classList.contains("slider-nav-autoplay")) {
          const timeout = sliderElement.getAttribute("data-slider-nav-autoplay-interval") ? sliderElement.getAttribute("data-slider-nav-autoplay-interval") : 2500;
          this.autoPlay(sliderElement, timeout, sliderElement.classList.contains("slider-nav-autopause"));
        }
        if (["slider-nav-autohide", "slider-nav-animation"].some((className) => sliderElement.classList.contains(className))) {
          const threshold = sliderElement.getAttribute("data-slider-nav-animation-threshold") ? sliderElement.getAttribute("data-slider-nav-animation-threshold") : 0.3;
          this.setVisibleSlides(sliderElement, threshold);
        }
      },
      setVisibleSlides(sliderElement, threshold = 0.3) {
        let observer = new IntersectionObserver((slides) => {
          slides.forEach((slide) => {
            slide.isIntersecting ? slide.target.classList.add("slide-visible") : slide.target.classList.remove("slide-visible");
          });
          sliderElement.querySelector(".slider-container>*:first-child").classList.contains("slide-visible") ? sliderElement.classList.add("slider-item-first-visible") : sliderElement.classList.remove("slider-item-first-visible");
          sliderElement.querySelector(".slider-container>*:last-child").classList.contains("slide-visible") ? sliderElement.classList.add("slider-item-last-visible") : sliderElement.classList.remove("slider-item-last-visible");
        }, {
          root: sliderElement.querySelector(".slider-container"),
          threshold
        });
        for (let slide of sliderElement.querySelectorAll(".slider-container>*"))
          observer.observe(slide);
      },
      slide(sliderElement, next = true) {
        const container = sliderElement.querySelector(".slider-container");
        const fullpage = sliderElement.classList.contains("slider-nav-page");
        const noloop = sliderElement.classList.contains("slider-nav-noloop");
        const nodelay = sliderElement.classList.contains("slider-nav-nodelay");
        const slides = container.children;
        const gapWidth = parseInt(window.getComputedStyle(container).columnGap);
        const scrollStep = slides[0].offsetWidth + gapWidth;
        let scrollLeftPosition = next ? container.scrollLeft + scrollStep : container.scrollLeft - scrollStep;
        if (fullpage) {
          scrollLeftPosition = next ? container.scrollLeft + container.offsetWidth : container.scrollLeft - container.offsetWidth;
        }
        if (container.scrollLeft < 1 && !next && !noloop) {
          scrollLeftPosition = container.scrollWidth - container.offsetWidth;
        }
        if (container.scrollLeft >= container.scrollWidth - container.offsetWidth && next && !noloop) {
          scrollLeftPosition = 0;
        }
        container.scroll({
          left: scrollLeftPosition,
          behavior: nodelay ? "auto" : "smooth"
        });
      },
      slideToByIndicator() {
        const indicator = window.event.target;
        const indicatorIndex = Array.from(indicator.parentElement.children).indexOf(indicator);
        const indicatorCount = indicator.parentElement.children.length;
        const sliderElement = indicator.closest(".swiffy-slider");
        const slideCount = sliderElement.querySelector(".slider-container").children.length;
        const relativeSlideIndex = slideCount / indicatorCount * indicatorIndex;
        this.slideTo(sliderElement, relativeSlideIndex);
      },
      slideTo(sliderElement, slideIndex) {
        const container = sliderElement.querySelector(".slider-container");
        const gapWidth = parseInt(window.getComputedStyle(container).columnGap);
        const scrollStep = container.children[0].offsetWidth + gapWidth;
        const nodelay = sliderElement.classList.contains("slider-nav-nodelay");
        container.scroll({
          left: scrollStep * slideIndex,
          behavior: nodelay ? "auto" : "smooth"
        });
      },
      onSlideEnd(sliderElement, delegate, timeout = 125) {
        let isScrolling;
        sliderElement.querySelector(".slider-container").addEventListener("scroll", function() {
          window.clearTimeout(isScrolling);
          isScrolling = setTimeout(delegate, timeout);
        }, { capture: false, passive: true });
      },
      autoPlay(sliderElement, timeout, autopause) {
        timeout = timeout < 750 ? 750 : timeout;
        let autoplayTimer = setInterval(() => this.slide(sliderElement), timeout);
        const autoplayer = () => this.autoPlay(sliderElement, timeout, autopause);
        if (autopause) {
          ["mouseover", "touchstart"].forEach(function(event) {
            sliderElement.addEventListener(event, function() {
              window.clearTimeout(autoplayTimer);
            }, { once: true, passive: true });
          });
          ["mouseout", "touchend"].forEach(function(event) {
            sliderElement.addEventListener(event, function() {
              autoplayer();
            }, { once: true, passive: true });
          });
        }
        return autoplayTimer;
      },
      handleIndicators(sliderElement) {
        if (!sliderElement)
          return;
        const container = sliderElement.querySelector(".slider-container");
        const slidingAreaWidth = container.scrollWidth - container.offsetWidth;
        const percentSlide = container.scrollLeft / slidingAreaWidth;
        for (let scrollIndicatorContainers of sliderElement.querySelectorAll(".slider-indicators")) {
          let scrollIndicators = scrollIndicatorContainers.children;
          let activeIndicator = Math.abs(Math.round((scrollIndicators.length - 1) * percentSlide));
          for (let element of scrollIndicators)
            element.classList.remove("active");
          scrollIndicators[activeIndicator].classList.add("active");
        }
      }
    };
  }();

  // src/js/slider.js
  var state = {
    initKeydownListener: false,
    initEscapeKeyListener: false,
    currentSlider: null,
    activeSlide: 0
  };
  var newElement = (element, classList) => {
    const newEl = document.createElement(element);
    if (typeof classList === "string") {
      newEl.classList.add(classList);
    } else {
      newEl.classList.add(...classList);
    }
    return newEl;
  };
  var initKeyboardNav = (sliderEl) => {
    state.currentSlider = sliderEl;
    if (state.initKeydownListener)
      return;
    window.addEventListener("keydown", (event) => {
      if (event.srcElement !== document.body)
        return;
      const key = event.key;
      const altKey = event.altKey;
      const code = event.which;
      if (key === "ArrowRight" || key === "PageDown") {
        event.preventDefault();
        swiffyslider.slide(state.currentSlider, true);
      } else if (key === "ArrowLeft" || key === "PageUp") {
        event.preventDefault();
        swiffyslider.slide(state.currentSlider, false);
      } else if (key === "ArrowUp" || key === "Home") {
        event.preventDefault();
        swiffyslider.slideTo(state.currentSlider, 0);
      } else if (key === "ArrowDown" || key === "End") {
        event.preventDefault();
        const slideCount = state.currentSlider.querySelectorAll(".slide").length;
        if (slideCount)
          swiffyslider.slideTo(state.currentSlider, slideCount);
      } else if (code >= 96 && code <= 105) {
        event.preventDefault();
        swiffyslider.slideTo(state.currentSlider, event.which - 96);
      } else if (code >= 48 && code <= 57) {
        event.preventDefault();
        swiffyslider.slideTo(state.currentSlider, event.which - 48);
      } else if (code === 70 && altKey) {
        event.preventDefault();
        const buttonEnlarge = state.currentSlider.querySelector(".action.enlarge");
        if (buttonEnlarge)
          buttonEnlarge.click();
      } else if (code === 90 && altKey) {
        event.preventDefault();
        const buttonZoom = state.currentSlider.querySelector(".action.zoom-in");
        if (buttonZoom)
          buttonZoom.click();
      }
    });
    state.initKeydownListener = true;
  };
  var initEscapeKey = (fullscreenElement) => {
    if (state.initEscapeKeyListener)
      return;
    window.addEventListener("keydown", (event) => {
      if (event.srcElement === document.body) {
        if (event.key === "Escape") {
          if (document.body.classList.contains("fullscreen")) {
            const buttonClose = fullscreenElement.querySelector(".action.close");
            if (buttonClose)
              buttonClose.click();
          }
        }
      }
    });
    state.initEscapeKeyListener = true;
  };
  var initFullscreenChange = (fullscreenElement) => {
    document.body.onfullscreenchange = () => {
      if (window.screen.availHeight !== window.innerHeight || window.screen.availWidth !== window.innerWidth) {
        const buttonClose = fullscreenElement.querySelector(".action.close");
        if (buttonClose)
          buttonClose.click();
      }
    };
  };
  var initIndicators = (slider) => {
    const sliderIndicators = slider.querySelector(".slider-indicators");
    if (!sliderIndicators)
      return;
    const slideCount = slider.querySelectorAll(".slide").length;
    if (!slideCount)
      return;
    for (let i = 0; i < slideCount; i++) {
      const button = newElement("button", "indicator");
      if (i === 0)
        button.classList.add("active");
      sliderIndicators.appendChild(button);
    }
    sliderIndicators.classList.add("visible");
  };
  var initFullScreen = async (slider, sliderEl, containerClass) => {
    const buttonEnlarge = slider.querySelector(".action.enlarge");
    if (!buttonEnlarge)
      return;
    await buttonEnlarge.addEventListener("click", async () => {
      const fullscreenSliderDiv = newElement("div", ["container", containerClass, "fullscreen"]);
      const rowEl = newElement("div", "row");
      const columnEl = newElement("div", ["column", "slider"]);
      const buttonClose = newElement("button", ["action", "close"]);
      const tooltip = newElement("span", ["tooltip", "tooltip--bottom", "tooltip--fade-in"]);
      tooltip.innerText = "Close";
      const thumbnails = slider.querySelector(".slider-thumbnails");
      if (thumbnails) {
        columnEl.appendChild(thumbnails.cloneNode(true));
      }
      const wrapper = slider.querySelector(".slider-wrapper");
      if (wrapper) {
        columnEl.appendChild(wrapper.cloneNode(true));
      }
      rowEl.appendChild(columnEl);
      fullscreenSliderDiv.appendChild(rowEl);
      buttonClose.appendChild(tooltip);
      fullscreenSliderDiv.appendChild(buttonClose);
      document.body.appendChild(fullscreenSliderDiv);
      const fullscreenSliderEl = fullscreenSliderDiv.querySelector(".swiffy-slider");
      fullscreenSliderEl.classList.remove("slider-nav-mousedrag");
      const enableKeyboardNav = fullscreenSliderEl.hasAttribute("data-enable-keyboard-nav");
      const fullscreenElement = document.querySelector(".container." + containerClass + ".fullscreen");
      const enableZoom = fullscreenSliderEl.hasAttribute("data-enable-zoom");
      if (thumbnails) {
        initThumbnails(fullscreenSliderDiv, fullscreenSliderEl);
      }
      swiffyslider.initSlider(fullscreenSliderEl);
      swiffyslider.slideTo(fullscreenSliderEl, state.activeSlide ? state.activeSlide : 0);
      document.body.classList.add("fullscreen");
      if (document.fullscreenEnabled) {
        if (!document.fullscreenElement) {
          await fullscreenElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
      if (enableKeyboardNav) {
        initKeyboardNav(fullscreenSliderEl);
      }
      buttonClose.addEventListener("click", () => {
        if (document.fullscreenEnabled && document.fullscreenElement) {
          document.exitFullscreen();
        }
        swiffyslider.slideTo(sliderEl, state.activeSlide ? state.activeSlide : 0);
        fullscreenSliderDiv.remove();
        if (enableKeyboardNav) {
          initKeyboardNav(sliderEl);
        }
        document.body.classList.remove("fullscreen", "disable-touch");
      });
      initEscapeKey(fullscreenElement);
      initFullscreenChange(fullscreenElement);
      if (enableZoom) {
        initZoom(fullscreenElement, fullscreenSliderEl);
      }
    });
    buttonEnlarge.classList.add("visible");
  };
  var initThumbnails = (slider, sliderEl) => {
    const thumbnailLoadCount = sliderEl.hasAttribute("data-thumbnail-load");
    const thumbnailsContainer = slider.querySelector(".slider-thumbnails ul");
    if (!thumbnailsContainer)
      return;
    const thumbnails = thumbnailsContainer.querySelectorAll("li");
    let thumbnailsToShow = 2;
    if (thumbnailLoadCount) {
      const thumbnailCount = parseInt(sliderEl.getAttribute("data-thumbnail-load"));
      if (thumbnailCount >= thumbnailsToShow)
        thumbnailsToShow = thumbnailCount;
    }
    swiffyslider.onSlideEnd(slider, () => {
      const slides = slider.querySelectorAll(".slider-container li");
      for (const [i, slide] of Array.from(slides).entries()) {
        thumbnails[i].classList.remove("active");
        if (slide.classList.contains("slide-visible")) {
          thumbnails[i].classList.add("active");
          state.activeSlide = i;
          if (thumbnailsToShow !== 0 && i >= thumbnailsToShow - 1) {
            for (const thumbnail of thumbnails) {
              thumbnail.classList.add("visible");
              thumbnail.removeAttribute("data-count");
              thumbnailsContainer.classList.add("scroll");
            }
          }
          thumbnails[i].parentNode.scrollTop = thumbnails[i].offsetTop;
        }
      }
    }, 150);
    for (const [i, el] of Array.from(thumbnails).entries()) {
      if (i === 0)
        el.classList.add("active");
      if (!thumbnailsToShow) {
        el.classList.add("visible");
        el.removeAttribute("data-count");
      }
      if (i < thumbnailsToShow) {
        el.classList.add("visible");
      }
      if (i + 1 === thumbnailsToShow && thumbnails.length !== thumbnailsToShow) {
        el.setAttribute("data-count", "+" + (thumbnails.length - thumbnailsToShow));
      }
      el.addEventListener("click", () => {
        if (i + 1 === thumbnailsToShow) {
          for (const el2 of thumbnails) {
            el2.classList.add("visible");
            el2.removeAttribute("data-count");
          }
        }
        swiffyslider.slideTo(slider, i);
        state.activeSlide = i;
      });
    }
    if (!thumbnailsToShow) {
      thumbnailsContainer.classList.add("scroll");
    }
  };
  var initZoom = (slider, sliderEl) => {
    const buttonZoom = slider.querySelector(".action.zoom-in");
    if (!buttonZoom)
      return;
    buttonZoom.addEventListener("click", () => {
      const zoomActive = buttonZoom.classList.contains("zoom-out");
      if (zoomActive) {
        buttonZoom.classList.remove("zoom-out");
        const canvas = slider.querySelector(".image-pan.image-zoom");
        canvas.remove();
      } else {
        const currentSlide = sliderEl.querySelector(".slide-visible img");
        zoom_default(slider, currentSlide.src);
        buttonZoom.classList.add("zoom-out");
      }
    });
    buttonZoom.classList.add("visible");
  };
  var initSliders = () => {
    const sliders = document.querySelectorAll(".slider");
    if (!sliders)
      return;
    for (const slider of sliders) {
      const sliderEl = slider.querySelector(".swiffy-slider");
      if (!sliderEl)
        continue;
      const enableIndicators = sliderEl.hasAttribute("data-enable-indicators");
      const hasThumbnails = slider.querySelector(".slider-thumbnails");
      const enableZoom = sliderEl.hasAttribute("data-enable-zoom");
      const enableFullScreen = sliderEl.hasAttribute("data-enable-fullscreen");
      const enableKeyboardNav = sliderEl.hasAttribute("data-enable-keyboard-nav");
      const containerClass = sliderEl.getAttribute("data-container-class");
      if (enableIndicators) {
        initIndicators(sliderEl);
      }
      if (hasThumbnails) {
        initThumbnails(slider, sliderEl);
      }
      if (enableZoom) {
        initZoom(slider, sliderEl);
      }
      if (enableFullScreen) {
        initFullScreen(slider, sliderEl, containerClass);
      }
      if (enableKeyboardNav) {
        initKeyboardNav(sliderEl);
      }
      swiffyslider.initSlider(sliderEl);
    }
  };
  initSliders();
  var slider_default = newElement;

  // src/js/carousel.js
  window.addEventListener("load", () => {
    const carousels = document.querySelectorAll(".carousel");
    if (carousels) {
      for (const carousel of carousels) {
        const init = () => {
          const titleEls = carousel.querySelectorAll(".slide-price--title");
          if (titleEls)
            titleEls.forEach((el) => el.setAttribute("title", el.innerText));
        };
        init();
      }
    }
  });

  // src/js/observers.js
  window.addEventListener("load", () => {
    const sliders = document.querySelectorAll(".swiffy-slider");
    if (!sliders)
      return;
    for (const slider of sliders) {
      const disableObservers = slider.hasAttribute("data-disable-observers");
      if (disableObservers)
        continue;
      const buttons = slider.querySelectorAll(".slider-nav");
      if (!buttons)
        continue;
      const resizeObserver = new ResizeObserver(() => {
        updateNavigationButtons();
        return;
      });
      resizeObserver.observe(slider);
      const mutationObserver = new MutationObserver((mutations) => {
        if (mutations[0].type === "attributes") {
          updateNavigationButtons();
          return;
        }
      });
      mutationObserver.observe(slider, { attributes: true });
      const updateNavigationButtons = () => {
        const slideCount = slider.querySelectorAll(".slide").length || 0;
        const slidesVisible = slider.querySelectorAll(".slide.slide-visible").length || 0;
        if (slidesVisible < slideCount) {
          buttons.forEach((button) => button.classList.add("visible"));
        } else {
          buttons.forEach((button) => button.classList.remove("visible"));
        }
      };
      updateNavigationButtons();
    }
  });
})();
//# sourceMappingURL=main.js.map

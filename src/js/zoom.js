'use strict'

import newElement from './slider'

/**
 * Transform fuctions for canvas
 * @param {object} context - canvas.getContext('2d')
 */
const trackTransforms = (context) => {

  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  let xform = svg.createSVGMatrix()

  context.getTransform = () => {
    return xform
  }

  let savedTransforms = []

  let save = context.save
  context.save = () => {
    savedTransforms.push(xform.translate(0, 0))
    return save.call(context)
  }

  let restore = context.restore
  context.restore = () => {
    xform = savedTransforms.pop()
    return restore.call(context)
  }

  let scale = context.scale
  context.scale = (sx, sy) => {
    xform = xform.scaleNonUniform(sx, sy)
    return scale.call(context, sx, sy)
  }

  let rotate = context.rotate
  context.rotate = (radians) => {
    xform = xform.rotate((radians * 180) / Math.PI)
    return rotate.call(context, radians)
  }

  let translate = context.translate
  context.translate = (dx, dy) => {
    xform = xform.translate(dx, dy)
    return translate.call(context, dx, dy)
  }

  let transform = context.transform
  context.transform = (a, b, c, d, e, f) => {
    let matrix = svg.createSVGMatrix()
    matrix.a = a
    matrix.b = b
    matrix.c = c
    matrix.d = d
    matrix.e = e
    matrix.f = f
    xform = xform.multiply(matrix)
    return transform.call(context, a, b, c, d, e, f)
  }

  let setTransform = context.setTransform
  context.setTransform = (a, b, c, d, e, f) => {
    xform.a = a
    xform.b = b
    xform.c = c
    xform.d = d
    xform.e = e
    xform.f = f
    return setTransform.call(context, a, b, c, d, e, f)
  }

  let pt = svg.createSVGPoint()
  context.transformedPoint = (x, y) => {
    pt.x = x
    pt.y = y
    return pt.matrixTransform(xform.inverse())
  }

}

/**
 * Adapted from [https://codepen.io/xiadd/pen/mdyEQVb]
 * @param {object} slider - The slider root element
 * @param {string} imageSource - URL of image
 */
const handleZoom = async (slider, imageSource) => {

  if (!slider || !imageSource) return
  let canvas = newElement('canvas', ['image-pan', 'image-zoom'])

  let wrapper = slider.querySelector('.slider-wrapper')
  wrapper.prepend(canvas)

  if (!canvas) return
  canvas.width = canvas.scrollWidth
  canvas.height = canvas.scrollHeight

  let image = new Image()
  image.src = imageSource
  await image.decode() // wait for image data

  let context = canvas.getContext('2d')
  trackTransforms(context)

  const redraw = () => {
    let p1 = context.transformedPoint(0, 0)
    let p2 = context.transformedPoint(canvas.width, canvas.height)
    context.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()

    const factor = Math.min(canvas.width / image.width, canvas.height / image.height)
    context.scale(factor, factor)
    context.drawImage(image, canvas.width - (image.width * factor), canvas.height - (image.height * factor))
    context.scale(1 / factor, 1 / factor)
  }

  redraw()

  let lastX = canvas.width / 2
  let lastY = canvas.height / 2
  let dragStart, dragged

  canvas.classList.add('visible')
  document.body.classList.add('disable-touch')

  canvas.addEventListener('mousedown', (event) => {
    lastX = event.offsetX || event.pageX - canvas.offsetLeft
    lastY = event.offsetY || event.pageY - canvas.offsetTop
    canvas.style.cursor = canvas.style.cursor !== 'grabbing' && 'grabbing'
    dragStart = context.transformedPoint(lastX, lastY)
    dragged = false
  }, { passive: false })

  canvas.addEventListener('mousemove', (event) => {
    lastX = event.offsetX || event.pageX - canvas.offsetLeft
    lastY = event.offsetY || event.pageY - canvas.offsetTop
    dragged = true
    if (dragStart) {
      let pt = context.transformedPoint(lastX, lastY)
      context.translate(pt.x - dragStart.x, pt.y - dragStart.y)
      redraw()
    }
  }, { passive: false })

  canvas.addEventListener('mouseup', (event) => {
    dragStart = null
    canvas.style.cursor = canvas.style.cursor !== 'grab' && 'grab'
    if (!dragged) zoom(event.shiftKey ? 1 : -1)
  }, { passive: false })

  canvas.addEventListener('touchstart', (event) => {
    const mousePos = getTouchPos(canvas, event)
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: mousePos.x,
      clientY: mousePos.y
    })
    canvas.dispatchEvent(mouseEvent) // simulate mousedown
  }, { passive: true })

  canvas.addEventListener('touchmove', (event) => {
    const touch = event.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    canvas.dispatchEvent(mouseEvent) // simulate mousemove
  }, { passive: true })

  canvas.addEventListener('touchend', () => {
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent) // simulate mouseup
  }, { passive: false })

  const getTouchPos = (canvasDom, touchEvent) => {
    var rect = canvasDom.getBoundingClientRect();
    return {
      x: touchEvent.touches[0].clientX - rect.left,
      y: touchEvent.touches[0].clientY - rect.top
    };
  }

  let zoom = (delta) => {

    let pt = context.transformedPoint(lastX, lastY)
    context.translate(pt.x, pt.y)

    let xform = context.getTransform()

    let a = xform.a
    let b = xform.b
    let c = xform.c
    let d = xform.d
    let e = xform.e
    let f = xform.f

    if (a <= 0.1) {
      a = 0.1
      d = 0.1
    } else if (a >= 3) {
      a = 3
      d = 3
    }

    context.setTransform(a, b, c, d, e, f)

    let factor = Math.pow(0.5, delta)

    if (a >= 0.1 || a <= 3) {
      context.scale(factor, factor)
    } else {
      context.scale(0, 0)
    }
    context.translate(-pt.x, -pt.y)
    redraw()

  }

  const handleScroll = (event) => {
    event.preventDefault()
    const delta = event.wheelDelta ? event.wheelDelta / 1500 : event.detail ? -event.detail : 0
    if (delta) zoom(delta)
  }

  canvas.addEventListener('wheel', handleScroll, { passive: false })

  const resizeObserver = new ResizeObserver(() => {
    updateCanvas(canvas)
    return
  });
  resizeObserver.observe(slider);

  const updateCanvas = (canvas) => {
    canvas.width = canvas.scrollWidth
    canvas.height = canvas.scrollHeight
    redraw()
  }
}

export default handleZoom
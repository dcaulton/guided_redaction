import React from 'react';

class CanvasImageOverlay extends React.Component {

  drawCrosshairs() {
    if (this.props.mode === 'add_2' || this.props.mode === 'delete_2' || 
        this.props.mode === 'add_ocr_2') {
      const crosshair_length = 2000
      let start_x = (this.props.last_click[0] - crosshair_length/2) / this.props.image_scale
      let end_x = (this.props.last_click[0] + crosshair_length/2) / this.props.image_scale
      let start_y = (this.props.last_click[1] - crosshair_length/2) / this.props.image_scale
      let end_y = (this.props.last_click[1] + crosshair_length/2) / this.props.image_scale
      const canvas = this.refs.canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = '#3F3'
      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.moveTo(start_x, this.props.last_click[1]*this.props.image_scale)
      ctx.lineTo(end_x, this.props.last_click[1]*this.props.image_scale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(this.props.last_click[0]*this.props.image_scale, start_y)
      ctx.lineTo(this.props.last_click[0]*this.props.image_scale, end_y)
      ctx.stroke()
    }
  }

  clearCanvasItems() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3'
    ctx.lineWidth = 3

    const areas_to_redact = this.props.getRedactionFromFrameset(this.props.frameset_hash)
    for (let i= 0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i]
      const start_x_scaled = a2r['start'][0] * this.props.image_scale
      const start_y_scaled = a2r['start'][1] * this.props.image_scale
      let width = (a2r['end'][0] - a2r['start'][0]) * this.props.image_scale
      let height = (a2r['end'][1] - a2r['start'][1]) * this.props.image_scale
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  drawDragDropTarget() {
    if (!this.props.image_url) {
      let canvas = this.refs.canvas
      let ctx = canvas.getContext("2d")
      ctx.beginPath()
      ctx.setLineDash([5,10])
      ctx.moveTo(5,5)
      ctx.lineTo(495,5)
      ctx.lineTo(495,495)
      ctx.lineTo(5,495)
      ctx.lineTo(5,5)
      ctx.stroke()

      ctx.font = '48px serif'
      ctx.fillStyle =  '#AAAAAA'
      ctx.fillText('drag here to upload', 50, 200)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawDragDropTarget()
    this.drawRectangles()
    this.drawCrosshairs()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawDragDropTarget()
    this.drawRectangles()
    this.drawCrosshairs()
  }

  getCanvasDims() {
    if (this.props.image_url) {
      return [
      this.props.image_width,
      this.props.image_height
      ]
    } else {
      return [500,500]
    }
  }

  async handleDownloadedFile(the_file) {
    let reader = new FileReader()
    let app_this = this
    reader.onload = function(e) {
      app_this.props.postMakeUrlCall(
        e.target.result, 
        the_file.name, 
        app_this.props.establishNewOneImageMovie
      )
    }
    reader.readAsDataURL(the_file)
  }

  handleDroppedImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.handleDownloadedFile(e.dataTransfer.files[0])
    }
  }

  render() {
    const canvasDims = this.getCanvasDims()
    let canvasDivStyle= {
      width: canvasDims[0],
      height: canvasDims[1],
    }
    return (
      <div id='canvas_div'
        style={canvasDivStyle}
        draggable='true'
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => this.handleDroppedImage(event)}
      >
        <canvas id='overlay_canvas' 
          ref='canvas'
          width={canvasDims[0]}
          height={canvasDims[1]}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    )
  }
}

export default CanvasImageOverlay;

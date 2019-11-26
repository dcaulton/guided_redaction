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

  componentDidMount() {
    this.clearCanvasItems()
    this.drawRectangles()
    this.drawCrosshairs()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawRectangles()
    this.drawCrosshairs()
  }

  render() {
    let canvasDivStyle= {
      width: this.props.image_width,
      height: this.props.image_height,
    }
    return (
      <div id='canvas_div'
        style={canvasDivStyle}
      >
        <canvas id='overlay_canvas' 
          ref='canvas'
          width={this.props.image_width}
          height={this.props.image_height}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    )
  }
}

export default CanvasImageOverlay;

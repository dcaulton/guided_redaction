import React from 'react';

class CanvasAnnotateOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.mask_zone_color = '#B6B'
  }

  drawCrosshairs() {
    let canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3'
    ctx.lineWidth = 1
    // TODO there is some sloppiness here that needs to be cleaned up.
    // the add_2 croosshairs need to be divided by image scale, the oval ones need to be multiplied by the same
    // looks like one is getting the unscaled coords, the other gets the scaled maybe?  
    if (
      this.props.mode === 'add_permanent_standard_box_2' 
      || this.props.mode === 'add_template_anchor_2' 
    ) {
      let crosshair_length = 2000
      let start_x = (this.props.last_click[0] - crosshair_length/2) / this.props.image_scale
      let end_x = (this.props.last_click[0] + crosshair_length/2) / this.props.image_scale
      let start_y = (this.props.last_click[1] - crosshair_length/2) / this.props.image_scale
      let end_y = (this.props.last_click[1] + crosshair_length/2) / this.props.image_scale

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

  drawBoxesAroundStartEndRecords(record_hash, outline_color) {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = outline_color
    ctx.lineWidth = 3
    ctx.globalAlpha = 1

    for (let i=0; i < Object.keys(record_hash).length; i++) {
      const rec_key = Object.keys(record_hash)[i]
      const record = record_hash[rec_key]
      let start = [0,0]
      let end = [0,0]
      if (Object.keys(record).includes('start')) {
        start = record['start']
        end = record['end']
      } else if (Object.keys(record).includes('location')) {
        start = record['location']
        end = [
          start[0] + record['size'][0],
          start[1] + record['size'][1]
        ]
      }
      const start_x_scaled = start[0] * this.props.image_scale
      const start_y_scaled = start[1] * this.props.image_scale
      const width = (end[0] - start[0]) * this.props.image_scale
      const height = (end[1] - start[1]) * this.props.image_scale
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  drawOcr() {
  }

  drawPermanentStandardBoxes() {
    const boxes = this.props.getPermanentStandardBoxes()
    this.drawBoxesAroundStartEndRecords(boxes, '#F24')
  }

  drawT1MatchBoxes() {
    const boxes = this.props.getT1MatchBoxes()
    this.drawBoxesAroundStartEndRecords(boxes, '#5F6')
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawCrosshairs()
    this.drawOcr()
    this.drawPermanentStandardBoxes()
    this.drawT1MatchBoxes()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawCrosshairs()
    this.drawOcr()
    this.drawPermanentStandardBoxes()
    this.drawT1MatchBoxes()
  }

  getCanvasDims() {
    if (this.props.image_url) {
      return [
        Math.ceil(this.props.image_width * this.props.image_scale),             
        Math.ceil(this.props.image_height * this.props.image_scale)
      ]
    } else {
      return [500,500]
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
        className='m-0 p-0 mw-100'
        style={canvasDivStyle}
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

export default CanvasAnnotateOverlay;

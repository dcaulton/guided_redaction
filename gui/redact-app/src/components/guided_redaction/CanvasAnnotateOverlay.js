import React from 'react';

class CanvasAnnotateOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.mask_zone_color = '#B6B'
  }

  drawTemplateMaskZones() {
    if (!this.props.currentImageIsTemplateAnchorImage()) {
      return
    }
    const mask_zones = this.props.getCurrentTemplateMaskZones()
    if (mask_zones) {
      this.drawBoxesAroundStartEndRecords(
        mask_zones,
        this.mask_zone_color
      )
    }
  }

  drawTemplateAnchors() {
    if (!this.props.currentImageIsTemplateAnchorImage()) {
      return
    }
    const anchors = this.props.getCurrentTemplateAnchors()
    if (anchors) {
      this.drawBoxesAroundStartEndRecords(
        anchors,
        this.anchor_color
      )
    }
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
      this.props.mode === 'add_2_box' 
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

  drawBoxesAroundStartEndRecords(records, outline_color) {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = outline_color
    ctx.lineWidth = 3
    ctx.globalAlpha = 1

    for (let i=0; i < records.length; i++) {
      let record = records[i]
      if (Object.keys(record).includes('start')) {
        let start = record['start']
        let end = record['end']
        const start_x_scaled = start[0] * this.props.image_scale
        const start_y_scaled = start[1] * this.props.image_scale
        const width = (end[0] - start[0]) * this.props.image_scale
        const height = (end[1] - start[1]) * this.props.image_scale
        ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
      }
    }
  }

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3'
    ctx.lineWidth = 3

    const areas_to_redact = this.props.getRedactionsFromCurrentFrameset()
    for (let i= 0; i < areas_to_redact.length; i++) {
      let a2r = areas_to_redact[i]
      let width = 0
      let height = 0
      let start_x_scaled = 0
      let start_y_scaled = 0
      if (Object.keys(a2r).includes('location') && Object.keys(a2r).includes('size')) {
        start_x_scaled = a2r['location'][0] * this.props.image_scale
        start_y_scaled = a2r['location'][1] * this.props.image_scale
        width = a2r['size'][0] * this.props.image_scale
        height = a2r['size'][1] * this.props.image_scale
      } else {
        start_x_scaled = a2r['start'][0] * this.props.image_scale
        start_y_scaled = a2r['start'][1] * this.props.image_scale
        width = (a2r['end'][0] - a2r['start'][0]) * this.props.image_scale
        height = (a2r['end'][1] - a2r['start'][1]) * this.props.image_scale
      }
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
//    if (this.props.show_redaction_borders) {
//      this.drawRectangles()
//    }
//    this.drawTemplateMaskZones()
//    this.drawTemplateAnchors()
    this.drawCrosshairs()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
//    if (this.props.show_redaction_borders) {
//      this.drawRectangles()
//    }
//    this.drawTemplateMaskZones()
//    this.drawTemplateAnchors()
    this.drawCrosshairs()
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

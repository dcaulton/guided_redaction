import React from 'react';

class CanvasImageOverlay extends React.Component {

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
    if (this.props.mode === 'add_2' || this.props.mode === 'delete_2' || 
        this.props.mode === 'add_template_anchor_2' || 
        this.props.mode === 'add_template_mask_zone_2' || 
        this.props.submode === 'ill_box_2' || this.props.mode === 'add_ocr_2') {
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

    if (this.props.submode === 'ill_oval_2' || this.props.submode === 'ill_oval_3') {
      let oval_crosshair_length = 140
      let start_x = (this.props.oval_center[0] - oval_crosshair_length/2) * this.props.image_scale
      let end_x = (this.props.oval_center[0] + oval_crosshair_length/2) * this.props.image_scale
      let start_y = (this.props.oval_center[1] - oval_crosshair_length/2) * this.props.image_scale
      let end_y = (this.props.oval_center[1] + oval_crosshair_length/2) * this.props.image_scale

      ctx.beginPath()
      ctx.moveTo(start_x, this.props.oval_center[1]*this.props.image_scale)
      ctx.lineTo(end_x, this.props.oval_center[1]*this.props.image_scale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(this.props.oval_center[0]*this.props.image_scale, start_y)
      ctx.lineTo(this.props.oval_center[0]*this.props.image_scale, end_y)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(
        this.props.oval_center[0]*this.props.image_scale, 
        this.props.oval_center[1]*this.props.image_scale, 
        30,
        0,
        2 * Math.PI
      )
      ctx.stroke()
    }

    if (this.props.submode === 'ill_oval_3') {
      let second_oval_crosshair_length = 140
      let start_x = this.props.last_click[0] * this.props.image_scale
      let start_y = (this.props.last_click[1] - second_oval_crosshair_length/2) * this.props.image_scale
      let end_y = (this.props.last_click[1] + second_oval_crosshair_length/2) * this.props.image_scale

      ctx.beginPath()
      ctx.moveTo(start_x, start_y) 
      ctx.lineTo(start_x, end_y)
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

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3'
    ctx.lineWidth = 3

    const areas_to_redact = this.props.getRedactionFromFrameset(this.props.frameset_hash)
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

  drawDragDropTarget() {
    if (!this.props.getImageUrl()) {
      let canvas = this.refs.canvas
      let ctx = canvas.getContext("2d")
      ctx.beginPath()
      ctx.setLineDash([5,10])
      ctx.moveTo(5,5)
      ctx.lineTo(495,5)
      ctx.lineTo(495,495)
      ctx.lineTo(5,495)
      ctx.lineTo(5,5)
      ctx.strokeStyle = '#AAAAAA'
      ctx.stroke()

      ctx.font = '48px serif'
      ctx.fillStyle = '#AAAAAA'
      ctx.fillText('drag images here', 80, 200)
      ctx.fillText('to begin work', 110, 270)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawDragDropTarget()
    this.drawRectangles()
    this.drawTemplateMaskZones()
    this.drawTemplateAnchors()
    this.drawCrosshairs()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawDragDropTarget()
    this.drawRectangles()
    this.drawTemplateMaskZones()
    this.drawTemplateAnchors()
    this.drawCrosshairs()
  }

  getCanvasDims() {
    if (this.props.getImageUrl()) {
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
      app_this.props.postMakeUrlCall({
        data_uri: e.target.result, 
        filename: the_file.name, 
        when_done: app_this.props.addImageToMovie,
        when_failed: (err) => {app_this.props.setMessage('make url job failed')},
      })
    }
    reader.readAsDataURL(the_file)
  }

  handleDroppedImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.props.establishNewEmptyMovie()
      for (let i=0; i < e.dataTransfer.files.length; i++) {
        this.handleDownloadedFile(e.dataTransfer.files[i])
      }
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

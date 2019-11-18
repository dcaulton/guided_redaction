import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  clearCanvasItems() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  getRoiScaledDimensions() {
    const start = this.props.roi['start']
    const end = this.props.roi['end']
    const width = (end[0] - start[0]) * this.props.image_scale
    const height = (end[1] - start[1]) * this.props.image_scale
    let ret_val = [width, height]
    return ret_val
  }

  drawRoi() {
    if (this.props.currentImageIsRoiImage()) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      
      const the_keys = Object.keys(this.props.roi)
      if (the_keys.includes('start')) {
        const start_x_scaled = this.props.roi['start'][0] * this.props.image_scale
        const start_y_scaled = this.props.roi['start'][1] * this.props.image_scale
        let lala = this.getRoiScaledDimensions() 
        let width = lala[0]
        let height = lala[1]
        ctx.strokeStyle = '#33F'
        ctx.lineWidth = 3
        ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
      }
    }
  }

  drawCrosshairs() {                                                            
    if ((this.props.mode === 'add_roi_2') 
        || (this.props.mode === 'arrow_fill_1')
        || (this.props.mode === 'flood_fill_1')) {
      const crosshair_length = 2000
      let start_x = this.props.clicked_coords[0] - crosshair_length/2
      start_x = start_x * this.props.image_scale
      let end_x = this.props.clicked_coords[0] + crosshair_length/2
      end_x = end_x * this.props.image_scale
      let start_y = this.props.clicked_coords[1] - crosshair_length/2
      start_y = start_y * this.props.image_scale
      let end_y = this.props.clicked_coords[1] + crosshair_length/2
      end_y = end_y * this.props.image_scale
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = '#F33'
      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.moveTo(start_x, this.props.clicked_coords[1]*this.props.image_scale)
      ctx.lineTo(end_x, this.props.clicked_coords[1]*this.props.image_scale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(this.props.clicked_coords[0]*this.props.image_scale, start_y)
      ctx.lineTo(this.props.clicked_coords[0]*this.props.image_scale, end_y)
      ctx.stroke()
    }
  }

  drawSubimageMatches() {
    let template_upper_left = this.props.getSubImageMatches()
    if (template_upper_left) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#3F3'
      ctx.lineWidth = 2
      const start_x_scaled = template_upper_left[0] * this.props.image_scale
      const start_y_scaled = template_upper_left[1] * this.props.image_scale
      let lala = this.getRoiScaledDimensions() 
      let width = lala[0]
      let height = lala[1]
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  drawSelectedAreas() {
    // This needs to run high in the stack, because it's a destructive rendering process
    const selected_areas = this.props.getSelectedAreas()
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#F3F'
    ctx.lineWidth = 3
    for (let i=0; i < selected_areas.length; i++) {
      const selected_area = selected_areas[i]
      const start_x_scaled = selected_area['start'][0] * this.props.image_scale
      const start_y_scaled = selected_area['start'][1] * this.props.image_scale
      const width = (selected_area['end'][0] * this.props.image_scale) - start_x_scaled
      const height= (selected_area['end'][1] * this.props.image_scale) - start_y_scaled
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
    for (let i=0; i < selected_areas.length; i++) {
      const selected_area = selected_areas[i]
      const start_x_scaled = selected_area['start'][0] * this.props.image_scale
      const start_y_scaled = selected_area['start'][1] * this.props.image_scale
      const width = (selected_area['end'][0] * this.props.image_scale) - start_x_scaled
      const height= (selected_area['end'][1] * this.props.image_scale) - start_y_scaled
      ctx.clearRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawRoi()
    this.drawSubimageMatches()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawRoi()
    this.drawSubimageMatches()
  }

  render() {
    let canvasDivStyle= {
      width: this.props.width,
      height: this.props.height,
    }
    return (
      <div 
          id='canvas_div_insights'
          style={canvasDivStyle}
      >
        <canvas id='overlay_canvas' 
          ref='insights_canvas'
          width={this.props.width}
          height={this.props.height}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    )
  }
}

export default CanvasInsightsOverlay;

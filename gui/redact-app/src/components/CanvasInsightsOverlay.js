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
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    
    const the_keys = Object.keys(this.props.roi)
    if (the_keys.includes('start')) {
      const start_x_scaled = this.props.roi['start'][0] * this.props.image_scale
      const start_y_scaled = this.props.roi['start'][1] * this.props.image_scale
      let lala = this.getRoiScaledDimensions() 
      let width = lala[0]
      let height = lala[1]
      ctx.strokeStyle = '#F33'
      ctx.lineWidth = 2
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  drawSubimageMatches() {
    let template_upper_left = this.props.getSubImageMatches()
    if (template_upper_left) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#E7E'
      const start_x_scaled = template_upper_left[0] * this.props.image_scale
      const start_y_scaled = template_upper_left[1] * this.props.image_scale
      let lala = this.getRoiScaledDimensions() 
      let width = lala[0]
      let height = lala[1]
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    if (Object.keys(this.props.subimage_matches).length === 0) {
      this.drawRoi()
    } else {
      this.drawSubimageMatches()
    }
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    if (Object.keys(this.props.subimage_matches).length === 0) {
      this.drawRoi()
    } else {
      this.drawSubimageMatches()
    }
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

import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  clearCanvasItems() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawRoi() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    
    const the_keys = Object.keys(this.props.roi)
    if (the_keys.includes('start')) {
      const start_x_scaled = this.props.roi['start'][0] * this.props.image_scale
      const start_y_scaled = this.props.roi['start'][1] * this.props.image_scale
      const start = this.props.roi['start']
      const end = this.props.roi['end']
      ctx.strokeStyle = '#F33'
      ctx.lineWidth = 2
      const width = (end[0] - start[0]) * this.props.image_scale
      const height = (end[1] - start[1]) * this.props.image_scale
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawRoi()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawRoi()
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

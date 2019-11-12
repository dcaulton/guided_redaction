import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  render() {
    return (
      <div id='canvas_div_insights'>
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

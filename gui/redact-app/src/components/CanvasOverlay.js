import React from 'react';

class CanvasOverlay extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areas_to_redact: this.props.areas_to_redact,
      mode: this.props.mode,
      submode: this.props.submode,
      prev_x: this.props.prev_x,
      prev_y: this.props.prev_y,
    }
  }

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3';
    ctx.lineWidth = 3;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i= 0; i < this.props.areas_to_redact.length; i++) {
      console.log('drawing number '+i);
      let a2r = this.props.areas_to_redact[i];
      let width = a2r['end'][0] - a2r['start'][0];
      let height = a2r['end'][1] - a2r['start'][1];
      ctx.strokeRect(a2r['start'][0], a2r['start'][1], width, height);
    }
  }

  componentDidMount() {
    this.drawRectangles()
  }

  componentDidUpdate() {
    this.drawRectangles()
  }

  render() {
    return (
      <div id='canvas_div'>
        <canvas id='overlay_canvas' 
          ref='canvas'
          width={this.props.image_width}
          height={this.props.image_height}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    );
  }
}

export default CanvasOverlay;

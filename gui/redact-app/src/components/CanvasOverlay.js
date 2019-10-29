import React from 'react';

class CanvasOverlay extends React.Component {

  drawCrosshairs() {
    if (this.props.mode === 'add_2' || this.props.mode === 'delete_2' || 
        this.props.mode === 'add_ocr_2') {
      const crosshair_length = 2000;
      let start_x = this.props.last_click[0] - crosshair_length/2;
      let end_x = this.props.last_click[0] + crosshair_length/2;
      let start_y = this.props.last_click[1] - crosshair_length/2;
      let end_y = this.props.last_click[1] + crosshair_length/2;
      const canvas = this.refs.canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = '#3F3';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(start_x, this.props.last_click[1]);
      ctx.lineTo(end_x, this.props.last_click[1]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.props.last_click[0], start_y);
      ctx.lineTo(this.props.last_click[0], end_y);
      ctx.stroke();
    }
  }

  clearCanvasItems() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  drawRectangles() {
    const canvas = this.refs.canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = '#3F3';
    ctx.lineWidth = 3;

    for (let i= 0; i < this.props.areas_to_redact.length; i++) {
      let a2r = this.props.areas_to_redact[i];
      let width = a2r['end'][0] - a2r['start'][0];
      let height = a2r['end'][1] - a2r['start'][1];
      ctx.strokeRect(a2r['start'][0], a2r['start'][1], width, height);
    }
  }

  componentDidMount() {
    this.clearCanvasItems();
    this.drawRectangles();
    this.drawCrosshairs();
  }

  componentDidUpdate() {
    this.clearCanvasItems();
    this.drawRectangles();
    this.drawCrosshairs();
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

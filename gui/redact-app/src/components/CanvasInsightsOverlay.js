import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.mask_zone_color = '#B6B'
    this.crosshairs_color = '#F33'
    this.template_match_color = '#3F3'
    this.selected_area_color = '#F3F'
  }

  clearCanvasItems() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawTemplateAnchors() {
    if (this.props.currentImageIsTemplateAnchorImage()) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = this.anchor_color
      ctx.lineWidth = 3
      
      const template_anchors = this.props.getCurrentTemplateAnchors()
      for (let i=0; i < template_anchors.length; i++) {
        let the_anchor = template_anchors[i]
        if (Object.keys(the_anchor).includes('start')) {
          let start = the_anchor['start']
          let end = the_anchor['end']
          const start_x_scaled = start[0] * this.props.insights_image_scale
          const start_y_scaled = start[1] * this.props.insights_image_scale
          const width = (end[0] - start[0]) * this.props.insights_image_scale
          const height = (end[1] - start[1]) * this.props.insights_image_scale
          ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
        }
      }
    }
  }

  drawTemplateMaskZones() {
    if (this.props.currentImageIsTemplateAnchorImage()) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = this.mask_zone_color
      ctx.lineWidth = 3
      
      const template_mask_zones = this.props.getCurrentTemplateMaskZones()
      for (let i=0; i < template_mask_zones.length; i++) {
        let the_mask_zone= template_mask_zones[i]
        if (Object.keys(the_mask_zone).includes('start')) {
          let start = the_mask_zone['start']
          let end = the_mask_zone['end']
          const start_x_scaled = start[0] * this.props.insights_image_scale
          const start_y_scaled = start[1] * this.props.insights_image_scale
          const width = (end[0] - start[0]) * this.props.insights_image_scale
          const height = (end[1] - start[1]) * this.props.insights_image_scale
          ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
        }
      }
    }
  }

  drawCrosshairs() {                                                            
    if ((this.props.mode === 'add_template_anchor_2') 
        || (this.props.mode === 'add_template_mask_zone_2')
        || (this.props.mode === 'arrow_fill_1')
        || (this.props.mode === 'flood_fill_1')) {
      const crosshair_length = 2000
      let start_x = this.props.clicked_coords[0] - crosshair_length/2
      start_x = start_x * this.props.insights_image_scale
      let end_x = this.props.clicked_coords[0] + crosshair_length/2
      end_x = end_x * this.props.insights_image_scale
      let start_y = this.props.clicked_coords[1] - crosshair_length/2
      start_y = start_y * this.props.insights_image_scale
      let end_y = this.props.clicked_coords[1] + crosshair_length/2
      end_y = end_y * this.props.insights_image_scale
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = this.crosshairs_color
      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.moveTo(start_x, this.props.clicked_coords[1]*this.props.insights_image_scale)
      ctx.lineTo(end_x, this.props.clicked_coords[1]*this.props.insights_image_scale)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(this.props.clicked_coords[0]*this.props.insights_image_scale, start_y)
      ctx.lineTo(this.props.clicked_coords[0]*this.props.insights_image_scale, end_y)
      ctx.stroke()
    }
  }

  drawTemplateMatches() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = this.template_match_color
    ctx.lineWidth = 2
    let matches = this.props.getTemplateMatches()
    if (!matches) {
      return
    }
    for (let i=0; i < Object.keys(matches).length; i++) {
      let anchor_id = Object.keys(matches)[i]
      let match = matches[anchor_id]
      let start = match['location']
      const start_x_scaled = start[0] * this.props.insights_image_scale
      const start_y_scaled = start[1] * this.props.insights_image_scale
      const width_scaled = match['size'][0] * this.props.insights_image_scale
      const height_scaled = match['size'][1] * this.props.insights_image_scale
      ctx.strokeRect(start_x_scaled, start_y_scaled, width_scaled, height_scaled)
    }
  }

  drawSelectedAreas() {
    // This needs to run high in the stack, because it's a destructive rendering process
    const selected_areas = this.props.getSelectedAreas()
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = this.selected_area_color
    ctx.lineWidth = 3
    for (let i=0; i < selected_areas.length; i++) {
      const selected_area = selected_areas[i]
      const start_x_scaled = selected_area['start'][0] * this.props.insights_image_scale
      const start_y_scaled = selected_area['start'][1] * this.props.insights_image_scale
      const width = (selected_area['end'][0] * this.props.insights_image_scale) - start_x_scaled
      const height= (selected_area['end'][1] * this.props.insights_image_scale) - start_y_scaled
      ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
    }
    for (let i=0; i < selected_areas.length; i++) {
      const selected_area = selected_areas[i]
      const start_x_scaled = selected_area['start'][0] * this.props.insights_image_scale
      const start_y_scaled = selected_area['start'][1] * this.props.insights_image_scale
      const width = (selected_area['end'][0] * this.props.insights_image_scale) - start_x_scaled
      const height= (selected_area['end'][1] * this.props.insights_image_scale) - start_y_scaled
      ctx.clearRect(start_x_scaled, start_y_scaled, width, height)
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
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

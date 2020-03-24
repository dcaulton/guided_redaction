import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.mask_zone_color = '#B6B'
    this.crosshairs_color = '#F33'
    this.template_match_color = '#3F3'
    this.selected_area_color = '#2B9'
    this.selected_area_center_color = '#9F3'
    this.selected_area_origin_location_color = '#40D'
    this.annotations_color = '#5DE'
    this.ocr_color = '#CC0'
    this.area_to_redact_color = '#D6D'
    this.red_color = '#F00'
  }

  clearCanvasItems() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawTemplateAnchors() {
    if (!this.props.currentImageIsTemplateAnchorImage()) {
      return
    }
    if (this.props.getCurrentTemplateAnchors()) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = this.anchor_color
      ctx.lineWidth = 3
      ctx.globalAlpha = 1
      
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
    if (!this.props.currentImageIsTemplateAnchorImage()) {
      return
    }
    if (this.props.getCurrentTemplateMaskZones()) {
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = this.mask_zone_color
      ctx.lineWidth = 3
      ctx.globalAlpha = 1
      
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
        || (this.props.mode === 'scan_ocr_2')) {
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
      ctx.globalAlpha = 1

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

  drawSelectedAreaCenters() {
    if (this.props.getCurrentSelectedAreaCenters() && this.props.getCurrentSelectedAreaCenters().length > 0) {
      const crosshair_length = 200
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = this.selected_area_center_color
      ctx.lineWidth = 1
      ctx.globalAlpha = 1

      const selected_area_centers = this.props.getCurrentSelectedAreaCenters()
      for (let i = 0; i < selected_area_centers.length; i++) {
        const center = selected_area_centers[i]
        let start_x = center['center'][0] - crosshair_length/2
        start_x = start_x * this.props.insights_image_scale
        let end_x = center['center'][0] + crosshair_length/2
        end_x = end_x * this.props.insights_image_scale
        let start_y = center['center'][1] - crosshair_length/2
        start_y = start_y * this.props.insights_image_scale
        let end_y = center['center'][1] + crosshair_length/2
        end_y = end_y * this.props.insights_image_scale

        ctx.beginPath()                                                           
        ctx.moveTo(start_x, center['center'][1]*this.props.insights_image_scale)
        ctx.lineTo(end_x, center['center'][1]*this.props.insights_image_scale)
        ctx.stroke()                                                              
                                                                                  
        ctx.beginPath()                                                           
        ctx.moveTo(center['center'][0]*this.props.insights_image_scale, start_y)
        ctx.lineTo(center['center'][0]*this.props.insights_image_scale, end_y)
        ctx.stroke()   
      }
    }
  }

  drawSelectedAreaOriginLocation() {
    if (this.props.getCurrentSelectedAreaOriginLocation() && this.props.getCurrentSelectedAreaOriginLocation().length > 0) {
      const crosshair_length = 200
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext("2d")
      ctx.strokeStyle = this.selected_area_origin_location_color
      ctx.lineWidth = 1
      ctx.globalAlpha = 1

      const origin = this.props.getCurrentSelectedAreaOriginLocation()
      if (origin) {
        let start_x = origin[0] - crosshair_length/2
        start_x = start_x * this.props.insights_image_scale
        let end_x = origin[0] + crosshair_length/2
        end_x = end_x * this.props.insights_image_scale
        let start_y = origin[1] - crosshair_length/2
        start_y = start_y * this.props.insights_image_scale
        let end_y = origin[1] + crosshair_length/2
        end_y = end_y * this.props.insights_image_scale

        ctx.beginPath()
        ctx.moveTo(start_x, origin[1]*this.props.insights_image_scale)
        ctx.lineTo(end_x, origin[1]*this.props.insights_image_scale)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(origin[0]*this.props.insights_image_scale, start_y)
        ctx.lineTo(origin[0]*this.props.insights_image_scale, end_y)
        ctx.stroke()
      }
    }
  }

  drawTier1Matches(scanner_type, fill_color, edge_color) {
    let matches = this.props.getTier1ScannerMatches(scanner_type)
    fill_color = fill_color || this.template_match_color
    edge_color = edge_color || this.red_color
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = fill_color
    ctx.lineWidth = 2
    if (!matches) {
      return
    }
    for (let i=0; i < Object.keys(matches).length; i++) {
      let anchor_id = Object.keys(matches)[i]
      let match = matches[anchor_id]
      let start = match['location']
      let template_scale = parseFloat(match['scale'])
      const start_x_scaled = start[0] * this.props.insights_image_scale 
      const start_y_scaled = start[1] * this.props.insights_image_scale
      const width_scaled = match['size'][0] * this.props.insights_image_scale / template_scale
      const height_scaled = match['size'][1] * this.props.insights_image_scale / template_scale
      ctx.fillStyle = fill_color
      ctx.globalAlpha = 0.4
      ctx.fillRect(start_x_scaled, start_y_scaled, width_scaled, height_scaled)
      ctx.strokeStyle = edge_color
      ctx.lineWidth = 3
      ctx.strokeRect(start_x_scaled, start_y_scaled, width_scaled, height_scaled)
    }
  }

  drawTemplateMatches() {
    this.drawTier1Matches('template', this.template_match_color, this.red_color) 
  }

  drawSelectedAreas() {
    this.drawTier1Matches('selected_area', this.selected_area_color, this.red_color) 
  }

  drawOcrMatches() {
    this.drawTier1Matches('ocr', this.ocr_color, this.red_color) 
  }

  drawAnnotations() {
    const annotations = this.props.getAnnotations()
    if (annotations) {
      let draw_annotation_label = false
      if (Object.keys(annotations).includes('all') && annotations['all']['data']) {
        draw_annotation_label = true
      }
      if (draw_annotation_label) {
        const canvas = this.refs.insights_canvas
        let ctx = canvas.getContext('2d')
        ctx.fillStyle = this.annotations_color
        ctx.font = '30px Arial'
        const x = canvas.width/2 * this.props.insights_image_scale
        const y = canvas.height/2 * this.props.insights_image_scale
        ctx.fillText('Template Annotated ', x+50, y+50)
        ctx.globalAlpha = 0.2
        ctx.fillRect(x, y, x, y)
      }
    }
  }

  drawAreasToRedact() {
    if (this.props.getCurrentAreasToRedact()) {
      const matches = this.props.getCurrentAreasToRedact()
      const canvas = this.refs.insights_canvas
      let ctx = canvas.getContext('2d')
      ctx.strokeStyle = this.area_to_redact_color
      ctx.lineWidth = 10
      for (let i=0; i < matches.length; i++) {
        const match = matches[i]
        ctx.fillStyle = this.area_to_redact_color
        ctx.globalAlpha = 0.4
        const start_x_scaled = match['start'][0] * this.props.insights_image_scale
        const start_y_scaled = match['start'][1] * this.props.insights_image_scale
        const width = (match['end'][0] * this.props.insights_image_scale) - start_x_scaled
        const height= (match['end'][1] * this.props.insights_image_scale) - start_y_scaled
        ctx.fillRect(start_x_scaled, start_y_scaled, width, height)
        ctx.strokeStyle = this.red_color
        ctx.lineWidth = 2
        ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
      }
    }
  }

  componentDidMount() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawSelectedAreaCenters()
    this.drawSelectedAreaOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawAnnotations()
    this.drawOcrMatches()
    this.drawAreasToRedact()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs()
    this.drawSelectedAreaCenters()
    this.drawSelectedAreaOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawAnnotations()
    this.drawOcrMatches()
    this.drawAreasToRedact()
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

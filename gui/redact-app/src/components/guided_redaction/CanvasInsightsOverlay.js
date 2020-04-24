import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.mask_zone_color = '#B6B'
    this.selected_area_minimum_zone_color = '#3EA'
    this.crosshairs_color = '#F33'
    this.template_match_color = '#3F3'
    this.selected_area_color = '#2B9'
    this.selected_area_center_color = '#9F3'
    this.selected_area_origin_location_color = '#40D'
    this.ocr_origin_location_color = '#51B'
    this.annotations_color = '#5DE'
    this.ocr_color = '#CC0'
    this.area_to_redact_color = '#D6D'
    this.ocr_window_color = '#DA9'
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
    const anchors = this.props.getCurrentTemplateAnchors()
    if (anchors) {
      this.drawBoxesAroundStartEndRecords(
        anchors,
        this.anchor_color
      )
    }
  }

  drawSelectedAreaMinimumZones() {
    if (!this.props.currentImageIsSelectedAreaAnchorImage()) {
      return
    }
    const selected_area_min_zones = this.props.getCurrentSelectedAreaMinimumZones()
    if (selected_area_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        selected_area_min_zones,
        this.selected_area_minimum_zone_color
      )
    }
  }

  drawBoxesAroundStartEndRecords(records, outline_color) {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.strokeStyle = outline_color
    ctx.lineWidth = 3
    ctx.globalAlpha = 1
    
    for (let i=0; i < records.length; i++) {
      let record = records[i]
      if (Object.keys(record).includes('start')) {
        let start = record['start']
        let end = record['end']
        const start_x_scaled = start[0] * this.props.insights_image_scale
        const start_y_scaled = start[1] * this.props.insights_image_scale
        const width = (end[0] - start[0]) * this.props.insights_image_scale
        const height = (end[1] - start[1]) * this.props.insights_image_scale
        ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
      }
    }
  }

  drawOcrWindow() {
    if (!this.props.currentImageIsOcrAnchorImage()) {
      return
    }
    const window = this.props.getCurrentOcrWindow()
    if (window) {
      this.drawBoxesAroundStartEndRecords(
        [window],
        this.ocr_window_color
      )
    }
  }

  drawShadedRectangleWithLabel(start, end, color, label='') {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.fillStyle = color
    ctx.globalAlpha = 0.4
    const start_x_scaled = start[0] * this.props.insights_image_scale
    const start_y_scaled = start[1] * this.props.insights_image_scale
    const width_scaled = (end[0] - start[0]) * this.props.insights_image_scale
    const height_scaled = (end[1] - start[1]) * this.props.insights_image_scale
    ctx.fillRect(start_x_scaled, start_y_scaled, width_scaled, height_scaled)
    if (label) {
      const x = (start[0]+50) * this.props.insights_image_scale
      const y = (start[1]+50) * this.props.insights_image_scale
      ctx.globalAlpha = 1
      ctx.fillStyle = '#000'
      ctx.fillText(label, x, y)
    }
  }

  drawOsaMatches() {
    if (!this.props.currentImageIsOsaMatchImage()) {
      return
    }
    const matches = this.props.getCurrentOcrSceneAnalysisMatches()
    for (let i=0; i < Object.keys(matches).length; i++) {
      const key = Object.keys(matches)[i]
      const match = matches[key]
      const rand_color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
      this.drawShadedRectangleWithLabel(match['start'], match['end'], rand_color, match['name'])
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

  drawCrosshairs(crosshair_mode, coords) {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = this.crosshairs_color
    ctx.lineWidth = 1
    ctx.globalAlpha = 1
    let crosshair_length = 0
    if (crosshair_mode === 'add_stuff') {
      if ((this.props.mode === 'add_template_anchor_2') 
          || (this.props.mode === 'add_template_mask_zone_2')
          || (this.props.mode === 'selected_area_minimum_zones_2')
          || (this.props.mode === 'scan_ocr_2')) {
        crosshair_length = 2000
      } 
    } 
    if (crosshair_mode === 'selected_area_center')  {
      crosshair_length = 200
    }
    if (!crosshair_length) {
      return
    }
    let start_x = coords[0] - crosshair_length/2
    start_x = start_x * this.props.insights_image_scale
    let end_x = coords[0] + crosshair_length/2
    end_x = end_x * this.props.insights_image_scale
    let start_y = coords[1] - crosshair_length/2
    start_y = start_y * this.props.insights_image_scale
    let end_y = coords[1] + crosshair_length/2
    end_y = end_y * this.props.insights_image_scale

    ctx.beginPath()
    ctx.moveTo(start_x, coords[1]*this.props.insights_image_scale)
    ctx.lineTo(end_x, coords[1]*this.props.insights_image_scale)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(coords[0]*this.props.insights_image_scale, start_y)
    ctx.lineTo(coords[0]*this.props.insights_image_scale, end_y)
    ctx.stroke()
  }

  drawSelectedAreaCenters() {
    if (!this.props.currentImageIsSelectedAreaAnchorImage()) {
      return
    }
    if (this.props.getCurrentSelectedAreaCenters() && this.props.getCurrentSelectedAreaCenters().length > 0) {
      const selected_area_centers = this.props.getCurrentSelectedAreaCenters()
      for (let i = 0; i < selected_area_centers.length; i++) {
        const center = selected_area_centers[i]
        this.drawCrosshairsGeneric(center['center'], this.selected_area_center_color)
      }
    }
  }


  drawCrosshairsGeneric(origin, color) {
    const crosshair_length = 200
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.globalAlpha = 1

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

  drawSelectedAreaOriginLocation() {
    if (!this.props.currentImageIsSelectedAreaAnchorImage()) {
      return
    }
    if (this.props.getCurrentSelectedAreaOriginLocation() && this.props.getCurrentSelectedAreaOriginLocation().length > 0) {
      const origin = this.props.getCurrentSelectedAreaOriginLocation()
      this.drawCrosshairsGeneric(origin, this.selected_area_origin_location_color)
    }
  }

  drawOcrOriginLocation() {
    if (!this.props.currentImageIsOcrAnchorImage()) {
      return
    }
    if (this.props.getCurrentOcrOriginLocation() && this.props.getCurrentOcrOriginLocation().length > 0) {
      const origin = this.props.getCurrentOcrOriginLocation()
      this.drawCrosshairsGeneric(origin, this.ocr_origin_location_color)
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

  drawScannerOrigins() {
    let matches = this.props.getTier1ScannerMatches('selected_area')
    if (!matches) {
      return
    }
    for (let i=0; i < Object.keys(matches).length; i++) {
      let anchor_id = Object.keys(matches)[i]
      let match = matches[anchor_id]
      if (Object.keys(match).includes('origin')) {
        this.drawCrosshairs('selected_area_center', match['origin'])
      }
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
        let start=0
        let end=0
        if (Object.keys(match).includes('start') && 
            Object.keys(match).includes('end')) {
          start = match['start']
          end = match['end']
        } else if (Object.keys(match).includes('location') && 
            Object.keys(match).includes('size')) {
          start = match['location']
          end = [
            start[0] + match['size'][0],
            start[1] + match['size'][1]
          ]
        }
        ctx.fillStyle = this.area_to_redact_color
        ctx.globalAlpha = 0.4
        const start_x_scaled = start[0] * this.props.insights_image_scale
        const start_y_scaled = start[1] * this.props.insights_image_scale
        const width = (end[0] * this.props.insights_image_scale) - start_x_scaled
        const height= (end[1] * this.props.insights_image_scale) - start_y_scaled
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
    this.drawCrosshairs('add_stuff', this.props.clicked_coords)
    this.drawSelectedAreaCenters()
    this.drawSelectedAreaMinimumZones()
    this.drawSelectedAreaOriginLocation()
    this.drawOcrOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawAnnotations()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawOsaMatches()
    this.drawAreasToRedact()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawCrosshairs('add_stuff', this.props.clicked_coords)
    this.drawSelectedAreaCenters()
    this.drawSelectedAreaMinimumZones()
    this.drawSelectedAreaOriginLocation()
    this.drawOcrOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawAnnotations()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawOsaMatches()
    this.drawAreasToRedact()
  }

  render() {
    let the_width = 1
    if (this.props.width) {
      the_width = this.props.width
    }
    let the_height = 1
    if (this.props.height) {
      the_height = this.props.height
    }
    let canvasDivStyle= {
      width: the_width * this.props.insights_image_scale,
      height: the_height * this.props.insights_image_scale,
    }
    return (
      <div 
          id='canvas_div_insights'
          style={canvasDivStyle}
      >
        <canvas id='overlay_canvas' 
          ref='insights_canvas'
          width={the_width * this.props.insights_image_scale}
          height={the_height * this.props.insights_image_scale}
          onClick={(e) => this.props.clickCallback(e)}
        />
      </div>
    )
  }
}

export default CanvasInsightsOverlay;

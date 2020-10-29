import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.sg_color = '#2F8'
    this.mask_zone_color = '#B6B'
    this.pipeline_color = '#F44'
    this.selected_area_minimum_zone_color = '#3EA'
    this.selected_area_maximum_zone_color = '#A3A'
    this.selected_area_origin_location_color = '#40D'
    this.mesh_match_minimum_zone_color = '#6EB'
    this.mesh_match_maximum_zone_color = '#AB2'
    this.mesh_match_origin_location_color = '#B06'
    this.crosshairs_color = '#F33'
    this.template_match_color = '#3F3'
    this.selected_area_color = '#2B9'
    this.mesh_match_color = '#C93'
    this.selected_area_center_color = '#9F3'
    this.ocr_origin_location_color = '#51B'
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

  drawSelectedAreaMaximumZones() {
    if (!this.props.currentImageIsSelectedAreaAnchorImage()) {
      return
    }
    const selected_area_min_zones = this.props.getCurrentSelectedAreaMaximumZones()
    if (selected_area_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        selected_area_min_zones,
        this.selected_area_maximum_zone_color
      )
    }
  }

  drawMeshMatchMinimumZones() {
    if (!this.props.currentImageIsMeshMatchAnchorImage()) {
      return
    }
    const mm_min_zones = this.props.getCurrentMeshMatchMinimumZones()
    if (mm_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        mm_min_zones,
        this.mesh_match_minimum_zone_color
      )
    }
  }

  drawMeshMatchMaximumZones() {
    if (!this.props.currentImageIsMeshMatchAnchorImage()) {
      return
    }
    const mm_min_zones = this.props.getCurrentMeshMatchMaximumZones()
    if (mm_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        mm_min_zones,
        this.mesh_match_maximum_zone_color
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
      } else if (Object.keys(record).includes('location')) {
        let start = record['location']
        let end = [
          record['location'][0] + record['size'][0],
          record['location'][1] + record['size'][1]
        ]
        const start_x_scaled = start[0] * this.props.insights_image_scale
        const start_y_scaled = start[1] * this.props.insights_image_scale
        const width = (end[0] - start[0]) * this.props.insights_image_scale
        const height = (end[1] - start[1]) * this.props.insights_image_scale
        ctx.strokeRect(start_x_scaled, start_y_scaled, width, height)
      }
    }
  }

  drawPipelineMatches() {
    const window = this.props.getCurrentPipelineMatches()
    if (window) {
      this.drawBoxesAroundStartEndRecords(
        window,
        this.pipeline_color
      )
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
          || (this.props.mode === 'selected_area_maximum_zones_2')
          || (this.props.mode === 'mesh_match_minimum_zones_2')
          || (this.props.mode === 'mesh_match_maximum_zones_2')
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

  drawSGColors() {
    if (!this.props.currentImageIsSGAnchorImage()) {
      return
    }
    if (this.props.getCurrentSGColors() && this.props.getCurrentSGColors().length > 0) {
      const colors = this.props.getCurrentSGColors()
      for (let i=0; i < colors.length; i++) {
        const color = colors[i]
        this.drawCrosshairsGeneric(color['location'], this.sg_color)
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

  drawMeshMatchOriginLocation() {
    if (!this.props.currentImageIsMeshMatchAnchorImage()) {
      return
    }
    if (this.props.getCurrentMeshMatchOriginLocation() && this.props.getCurrentMeshMatchOriginLocation().length > 0) {
      const origin = this.props.getCurrentMeshMatchOriginLocation()
      this.drawCrosshairsGeneric(origin, this.mesh_match_origin_location_color)
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
      if (Object.keys(match).includes('start')) {
        start = match['start']
      }
      let template_scale = 1
      if (Object.keys(match).includes('scale')) {
        template_scale = parseFloat(match['scale'])
      }
      let size=[500,800]
      if (Object.keys(match).includes('size')) {
        size = match['size']
      } else if (Object.keys(match).includes('start')) {
        const x = match['end'][0] - match['start'][0]
        const y = match['end'][1] - match['start'][1]
        size = [x, y]
      }
      
      const start_x_scaled = start[0] * this.props.insights_image_scale 
      const start_y_scaled = start[1] * this.props.insights_image_scale
      const width_scaled = size[0] * this.props.insights_image_scale / template_scale
      const height_scaled = size[1] * this.props.insights_image_scale / template_scale
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

  drawMeshMatches() {
    this.drawTier1Matches('mesh_match', this.mesh_match_color, this.red_color) 
  }

  drawOcrMatches() {
    this.drawTier1Matches('ocr', this.ocr_color, this.red_color) 
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
    this.drawMeshMatches()
    this.drawCrosshairs('add_stuff', this.props.clicked_coords)
    this.drawSelectedAreaCenters()
    this.drawSGColors()
    this.drawSelectedAreaMinimumZones()
    this.drawSelectedAreaMaximumZones()
    this.drawSelectedAreaOriginLocation()
    this.drawMeshMatchMinimumZones()
    this.drawMeshMatchMaximumZones()
    this.drawMeshMatchOriginLocation()
    this.drawOcrOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawOsaMatches()
    this.drawPipelineMatches()
    this.drawAreasToRedact()
  }

  componentDidUpdate() {
    this.clearCanvasItems()
    this.drawSelectedAreas()
    this.drawMeshMatches()
    this.drawCrosshairs('add_stuff', this.props.clicked_coords)
    this.drawSelectedAreaCenters()
    this.drawSGColors()
    this.drawSelectedAreaMinimumZones()
    this.drawSelectedAreaMaximumZones()
    this.drawSelectedAreaOriginLocation()
    this.drawMeshMatchMinimumZones()
    this.drawMeshMatchMaximumZones()
    this.drawMeshMatchOriginLocation()
    this.drawOcrOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawOsaMatches()
    this.drawPipelineMatches()
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

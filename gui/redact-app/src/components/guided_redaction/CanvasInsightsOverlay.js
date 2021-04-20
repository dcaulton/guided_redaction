import React from 'react';

class CanvasInsightsOverlay extends React.Component {

  constructor (props) {
    super(props)
    this.anchor_color = '#33F'
    this.sg_color = '#2F8'
    this.mask_zone_color = '#B6B'
    this.pipeline_color = '#F44'
    this.intersect_color = '#DE7'
    this.sum_color = '#7ED'
    this.selected_area_minimum_zone_color = '#3EA'
    this.data_sifter_rows_color = '#F33'
    this.data_sifter_left_cols_color = '#3F3'
    this.data_sifter_right_cols_color = '#33F'
    this.selected_area_maximum_zone_color = '#A3A'
    this.selected_area_manual_zone_color = '#D9E'
    this.selected_area_origin_location_color = '#40D'
    this.mesh_match_minimum_zone_color = '#6EB'
    this.mesh_match_maximum_zone_color = '#AB2'
    this.mesh_match_origin_location_color = '#B06'
    this.crosshairs_color = '#F33'
    this.template_match_color = '#3F3'
    this.selected_area_color = '#2B9'
    this.mesh_match_color = '#C93'
    this.selection_grower_fill_color = '#A83'
    this.data_sifter_fill_color = '#3BC'
    this.data_sifter_rowcol_fill_color = '#A9C'
    this.data_sifter_app_label_rowcol_fill_color = '#79F'
    this.data_sifter_app_hot_userdata_rowcol_fill_color = '#DB9'
    this.data_sifter_app_cool_userdata_rowcol_fill_color = '#7F9'
    this.selected_area_center_color = '#9F3'
    this.ocr_color = '#CC0'
    this.area_to_redact_color = '#D6D'
    this.ocr_window_color = '#DA9'
    this.red_color = '#F33'
    this.green_color = '#3F3'
  }

  clearCanvasItems() {
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  drawTemplateAnchors() {
    if (!this.props.currentImageIsT1ScannerRootImage('template', ['anchors'])) {
      return
    }
    const anchors = this.props.runCallbackFunction('getCurrentTemplateAnchors')
    if (anchors) {
      this.drawBoxesAroundStartEndRecords(
        anchors,
        this.anchor_color
      )
    }
  }

  drawSelectedAreaMinimumZones() {
    if (!this.props.currentImageIsT1ScannerRootImage('selected_area', ['minimum_zones', 'maximum_zones', 'areas'])) {
      return
    }
    const selected_area_min_zones = this.props.runCallbackFunction('getCurrentSelectedAreaMinimumZones')
    if (selected_area_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        selected_area_min_zones,
        this.selected_area_minimum_zone_color
      )
    }
  }

  drawSelectedAreaMaximumZones() {
    if (!this.props.currentImageIsT1ScannerRootImage('selected_area', ['minimum_zones', 'maximum_zones', 'areas'])) {
      return
    }
    const selected_area_min_zones = this.props.runCallbackFunction('getCurrentSelectedAreaMaximumZones')
    if (selected_area_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        selected_area_min_zones,
        this.selected_area_maximum_zone_color
      )
    }
  }

  drawSelectedAreaManualZones() {
    const man_zones = this.props.runCallbackFunction('getCurrentSelectedAreaManualZones')
    if (man_zones && Object.keys(man_zones).length > 0) {
      for (let i=0; i < Object.keys(man_zones).length; i++) {
        const mz_key = Object.keys(man_zones)[i]
        const mz = man_zones[mz_key]
        this.drawBoxesAroundStartEndRecords(
          [mz],
          this.selected_area_manual_zone_color
        )
      }
    }
  }

  drawDataSifterAppRowCols() {
    const app_rowcols = this.props.runCallbackFunction('getDataSifterAppRowCols')

    if (!app_rowcols) {
      return
    }
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext("2d")
    ctx.strokeStyle = this.data_sifter_rows_color
    ctx.lineWidth = 5
    ctx.globalAlpha = 1

    if (Object.keys(app_rowcols).includes('rows')) {
      for (let i=0; i < app_rowcols['rows'].length; i++) {
        const row_info = app_rowcols['rows'][i]
        const row_start_x = row_info['start'][0]*this.props.insights_image_scale
        const row_start_y = row_info['start'][1]*this.props.insights_image_scale
        const row_end_x = row_info['end'][0]*this.props.insights_image_scale
        const row_end_y = row_info['end'][1]*this.props.insights_image_scale
        ctx.beginPath()
        ctx.moveTo(row_start_x, row_start_y)
        ctx.lineTo(row_end_x, row_end_y)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = this.data_sifter_left_cols_color
    if (Object.keys(app_rowcols).includes('left_cols')) {
      for (let i=0; i < app_rowcols['left_cols'].length; i++) {
        const row_info = app_rowcols['left_cols'][i]
        const row_start_x = row_info['start'][0]*this.props.insights_image_scale
        const row_start_y = row_info['start'][1]*this.props.insights_image_scale
        const row_end_x = row_info['end'][0]*this.props.insights_image_scale
        const row_end_y = row_info['end'][1]*this.props.insights_image_scale
        const row_center_x = (row_start_x + row_end_x) / 2
        ctx.beginPath()
        ctx.moveTo(row_start_x, row_start_y)
        ctx.lineTo(row_end_x, row_end_y)
        ctx.stroke()
        for (let j=0; j < row_info['centers'].length; j++) {
          const center_y = row_info['centers'][j]*this.props.insights_image_scale
          ctx.beginPath()
          ctx.arc(row_center_x, center_y, 2, 0, 2 * Math.PI, false)
          ctx.fillStyle = 'white'
          ctx.fill()
        }
      }
    }
    ctx.strokeStyle = this.data_sifter_right_cols_color
    if (Object.keys(app_rowcols).includes('right_cols')) {
      for (let i=0; i < app_rowcols['right_cols'].length; i++) {
        const row_info = app_rowcols['right_cols'][i]
        const row_start_x = row_info['start'][0]*this.props.insights_image_scale
        const row_start_y = row_info['start'][1]*this.props.insights_image_scale
        const row_end_x = row_info['end'][0]*this.props.insights_image_scale
        const row_end_y = row_info['end'][1]*this.props.insights_image_scale
        const row_center_x = (row_start_x + row_end_x) / 2
        ctx.beginPath()
        ctx.moveTo(row_start_x, row_start_y)
        ctx.lineTo(row_end_x, row_end_y)
        ctx.stroke()
        for (let j=0; j < row_info['centers'].length; j++) {
          const center_y = row_info['centers'][j]*this.props.insights_image_scale
          ctx.beginPath()
          ctx.arc(row_center_x, center_y, 2, 0, 2 * Math.PI, false)
          ctx.fillStyle = 'white'
          ctx.fill()
        }
      }
    }
  }

  drawDataSifterAppZones() {
    const app_zones = this.props.runCallbackFunction('getDataSifterAppZones')
    if (!app_zones) {
      return
    }
    const highlighted_app_id = this.props.runCallbackFunction('getDataSifterHighlightedItemId')
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    for (let i=0; i < Object.keys(app_zones).length; i++) {
      const app_id = Object.keys(app_zones)[i]
      const app_obj = app_zones[app_id]
      const resp_obj = this.getScaledStartAndSizeFromMatchObject(app_obj) 
      const start_x = resp_obj[0]
      const start_y = resp_obj[1]
      const width = resp_obj[2]
      const height = resp_obj[3]
      if (app_obj['type'] === 'label') {
        let border_color = this.data_sifter_app_label_rowcol_fill_color
        if (app_id === highlighted_app_id) {
          border_color = this.red_color
        }
        this.drawAlphaBoxAndBorder(
          canvas, ctx, 
          this.data_sifter_app_label_rowcol_fill_color,
          border_color,
          start_x, 
          start_y, 
          width, 
          height
        ) 
      } else if (app_obj['type'] === 'user_data') {
        let border_color = this.data_sifter_app_hot_userdata_rowcol_fill_color
        if (app_id === highlighted_app_id) {
          border_color = this.red_color
        }
        this.drawAlphaBoxAndBorder(
          canvas, ctx, 
          this.data_sifter_app_hot_userdata_rowcol_fill_color,
          border_color,
          start_x, 
          start_y, 
          width, 
          height
        ) 
      }
    }
  }

  drawDataSifterZones() {
    let matches = this.props.getTier1ScannerMatches('data_sifter')
    if (!matches) {
      return
    }
    if (!this.props.visibilityFlags['t1_matches']['data_sifter']) {
      return
    }
    const show_type = this.props.runCallbackFunction('getDataSifterShowType')
    const canvas = this.refs.insights_canvas
    let ctx = canvas.getContext('2d')
    for (let i=0; i < Object.keys(matches).length; i++) {
      const match_key = Object.keys(matches)[i]
      const match = matches[match_key]
      const resp_obj = this.getScaledStartAndSizeFromMatchObject(match) 
      const start_x = resp_obj[0]
      const start_y = resp_obj[1]
      const width = resp_obj[2]
      const height = resp_obj[3]
      if (show_type === 'all' && Object.keys(match).includes('row_column_type')) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_rowcol_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (show_type === 'all' && !Object.keys(match).includes('row_column_type')) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (show_type === 'mask_items' && !Object.keys(match).includes('row_column_type')) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (show_type === 'rows' && 
        Object.keys(match).includes('row_column_type') && match['row_column_type'] === 'row') 
      {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_rowcol_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (
        show_type === 'left_cols' && 
        Object.keys(match).includes('row_column_type') && match['row_column_type'] === 'left_col'
      ) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_rowcol_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (
          show_type === 'right_cols' && 
          Object.keys(match).includes('row_column_type') && match['row_column_type'] === 'right_col'
      ) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_rowcol_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      } else if (
          show_type === 'fast_pass_anchors' && 
          Object.keys(match).includes('row_column_type') && match['row_column_type'] === 'fast_pass_anchor'
      ) {
        this.drawAlphaBoxAndBorder(
          canvas, ctx, this.data_sifter_rowcol_fill_color, this.red_color, start_x, start_y, width, height
        ) 
      }
    }
  }

  drawSelectionGrowerZones() {
    this.drawTier1Matches('selection_grower', this.selection_grower_fill_color, this.red_color) 
  }

  drawMeshMatchMinimumZones() {
    if (!this.props.currentImageIsT1ScannerRootImage('mesh_match', ['minimum_zones', 'maximum_zones'])) {
      return
    }
    const mm_min_zones = this.props.runCallbackFunction('getCurrentMeshMatchMinimumZones')
    if (mm_min_zones) {
      this.drawBoxesAroundStartEndRecords(
        mm_min_zones,
        this.mesh_match_minimum_zone_color
      )
    }
  }

  drawMeshMatchMaximumZones() {
    if (!this.props.currentImageIsT1ScannerRootImage('mesh_match', ['minimum_zones', 'maximum_zones'])) {
      return
    }
    const mm_min_zones = this.props.runCallbackFunction('getCurrentMeshMatchMaximumZones')
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

  drawIntersectMatches() {
    const matches = this.props.getCurrentIntersectMatches()
    if (!matches) {
      return
    }
    for (let i=0; i < Object.keys(matches).length; i++) {
      const key = Object.keys(matches)[i]
      const match = matches[key]
      const end = [
        match['location'][0] + match['size'][0],
        match['location'][1] + match['size'][1]
      ]
      this.drawShadedRectangleWithLabel(match['location'], end, this.intersect_color, '')
    }
  }

  drawSumMatches() {
    const matches = this.props.getCurrentSumMatches()
    if (!matches) {
      return
    }
    for (let i=0; i < Object.keys(matches).length; i++) {
      const key = Object.keys(matches)[i]
      const match = matches[key]
      let start = [0, 0]
      let end = [0, 0]
      if (Object.keys(match).includes('location')) {
        start = match['location']
        end = [
          match['location'][0] + match['size'][0],
          match['location'][1] + match['size'][1]
        ]
      } else if (Object.keys(match).includes('start')) {
        start = match['start']
        end = match['end']
      }
      this.drawShadedRectangleWithLabel(start, end, this.sum_color, '')
    }
  }

  drawOcrWindow() {
    const window = this.props.runCallbackFunction('getOcrWindow')
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

  drawTemplateMaskZones() {
    if (!this.props.currentImageIsT1ScannerRootImage('template', ['anchors'])) {
      return
    }
    const mask_zones = this.props.runCallbackFunction('getCurrentTemplateMaskZones')
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
          || (this.props.mode === 'selected_area_manual_zones_2')
          || (this.props.mode === 'selection_grower_add_color_zone_2')
          || (this.props.mode === 'selected_area_maximum_zones_2')
          || (this.props.mode === 'mesh_match_minimum_zones_2')
          || (this.props.mode === 'mesh_match_maximum_zones_2')
          || (this.props.mode === 'ds_delete_ocr_area_2')
          || (this.props.mode === 'ds_add_item_2')
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
    if (!this.props.currentImageIsT1ScannerRootImage('selected_area', ['minimum_zones', 'maximum_zones', 'areas'])) {
      return
    }
    const selected_area_centers = this.props.runCallbackFunction('getCurrentSelectedAreaCenters')
    if (selected_area_centers && selected_area_centers.length > 0) {
      for (let i = 0; i < selected_area_centers.length; i++) {
        const center = selected_area_centers[i]
        this.drawCrosshairsGeneric(center['center'], this.selected_area_center_color)
      }
    }
  }

  drawSGColors() {
    if (!this.props.currentImageIsT1ScannerRootImage('selection_grower', ['colors'])) {
      return
    }
    const colors = this.props.runCallbackFunction('getCurrentSGColors')
    if (colors && colors.length > 0) {
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
    const origin = this.props.runCallbackFunction('getCurrentSelectedAreaOriginLocation')
    if (origin && origin.length > 0) {
      this.drawCrosshairsGeneric(origin, this.selected_area_origin_location_color)
    }
  }

  drawMeshMatchOriginLocation() {
    const origin = this.props.runCallbackFunction('getCurrentMeshMatchOriginLocation')
    if (origin && origin.length > 0) {
      this.drawCrosshairsGeneric(origin, this.mesh_match_origin_location_color)
    }
  }

  drawTier1Matches(scanner_type, fill_color, edge_color) {
    if (!this.props.visibilityFlags['t1_matches'][scanner_type]) {
      return
    }
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
      const resp_obj = this.getScaledStartAndSizeFromMatchObject(match) 
      const start_x_scaled = resp_obj[0]
      const start_y_scaled = resp_obj[1]
      const width_scaled = resp_obj[2]
      const height_scaled = resp_obj[3]
      this.drawAlphaBoxAndBorder(canvas, ctx, fill_color, edge_color, start_x_scaled, start_y_scaled, width_scaled, height_scaled)
    }
  }

  getScaledStartAndSizeFromMatchObject(match) {
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
    return [start_x_scaled, start_y_scaled, width_scaled, height_scaled]
  }

  drawAlphaBoxAndBorder(canvas, ctx, fill_color, edge_color, start_x, start_y, width, height) {
    ctx.fillStyle = fill_color
    ctx.globalAlpha = 0.4
    ctx.fillRect(start_x, start_y, width, height)
    ctx.strokeStyle = edge_color
    ctx.lineWidth = 3
    ctx.strokeRect(start_x, start_y, width, height)
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
    this.drawSelectedAreaManualZones()
    this.drawSelectedAreaOriginLocation()
    this.drawMeshMatchMinimumZones()
    this.drawMeshMatchMaximumZones()
    this.drawMeshMatchOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawPipelineMatches()
    this.drawIntersectMatches()
    this.drawSumMatches()
    this.drawAreasToRedact()
    this.drawSelectionGrowerZones()
    this.drawDataSifterZones()
    this.drawDataSifterAppZones()
    this.drawDataSifterAppRowCols()
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
    this.drawSelectedAreaManualZones()
    this.drawSelectedAreaOriginLocation()
    this.drawMeshMatchMinimumZones()
    this.drawMeshMatchMaximumZones()
    this.drawMeshMatchOriginLocation()
    this.drawTemplateAnchors()
    this.drawTemplateMaskZones()
    this.drawTemplateMatches()
    this.drawScannerOrigins()
    this.drawOcrMatches()
    this.drawOcrWindow()
    this.drawPipelineMatches()
    this.drawIntersectMatches()
    this.drawSumMatches()
    this.drawAreasToRedact()
    this.drawSelectionGrowerZones()
    this.drawDataSifterZones()
    this.drawDataSifterAppZones()
    this.drawDataSifterAppRowCols()
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

import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, 
  buildLabelAndTextInput,
  buildLabelAndDropdown,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
  buildRunButton,
  doTier1Save,
} from './SharedControls'


class SelectionGrowerControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      direction: 'south',
      offsets: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      },
      colors: {},
      capture_grid: false,
      capture_form: false,
      merge_response: true,
      tie_grid_to_selected_area: true,
      row_column_threshold: 2,
      ocr_job_id: '',
      usage_mode: 'color_projection',
      debug: false,
      skip_if_ocr_needed: false,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getSelectionGrowerMetaFromState=this.getSelectionGrowerMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.addColorCenterCallback=this.addColorCenterCallback.bind(this)
    this.getColorAtPixelCallback=this.getColorAtPixelCallback.bind(this)
    this.getColors=this.getColors.bind(this)
    this.buildColorKey=this.buildColorKey.bind(this)
  }

  getColors() {
    return this.state.colors
  }

  getColorAtPixelCallback(response_obj) {
    if (!Object.keys(response_obj).includes('color')) {
      return
    }
    let build_colors = {}
    for (let i=0; i < Object.keys(this.state.colors).length; i++) {
      const old_color_key = Object.keys(this.state.colors)[i]
      build_colors[old_color_key] = this.state.colors[old_color_key]
    }

    const color_obj = {
      whitelist_or_blacklist: 'whitelist',
      thickness: 0,
      tolerance: 25,
      value: response_obj['color'],
    }
    const color_key = this.buildColorKey(response_obj['color'])
    build_colors[color_key] = color_obj
    this.setLocalStateVar('colors', build_colors)
  }

  buildColorKey(color) {
    return color[0].toString() + '-' + color[1].toString() + '-' + color[2].toString()
  }

  addColorCenterCallback(clicked_coords) {
    this.props.getColorAtPixel(this.props.insights_image, clicked_coords, this.getColorAtPixelCallback)
  }

  startAddColorCenters() {
    this.props.handleSetMode('selection_grower_add_color_center')
    this.props.displayInsightsMessage('specify a point with the color you want')
  }

  buildAddColorCentersButton() {
    return buildInlinePrimaryButton(
      'Add Colors',
      (()=>{this.startAddColorCenters()})
    )
  }

  componentDidMount() {
    this.props.addInsightsCallback('selection_grower_add_color_center', this.addColorCenterCallback)
    this.props.addInsightsCallback('getCurrentSGColors', this.getColors)
    this.loadNewSelectionGrowerMeta()
    this.setUsageMode('color_projection')
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      this.doSave()
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
      },
      anon_func
    )
  }

  buildLoadButton() {                                                           
    return buildTier1LoadButton(
      'selection_grower',
      this.props.tier_1_scanners['selection_grower'],
      ((value)=>{this.loadSelectionGrowerMeta(value)})
    )
  }

  loadSelectionGrowerMeta(sg_meta_id) {
    if (!sg_meta_id) {
      this.loadNewSelectionGrowerMeta()
    } else {
      const sam = this.props.tier_1_scanners['selection_grower'][sg_meta_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        attributes: sam['attributes'],
        scan_level: sam['scan_level'],
        direction: sam['direction'],
        offsets: sam['offsets'],
        colors: sam['colors'],
        capture_grid: sam['capture_grid'],
        capture_form: sam['capture_form'],
        merge_response: sam['merge_response'],
        tie_grid_to_selected_area: sam['tie_grid_to_selected_area'],
        row_column_threshold: sam['row_column_threshold'],
        ocr_job_id: sam['ocr_job_id'],
        usage_mode: sam['usage_mode'],
        debug: sam['debug'],
        skip_if_ocr_needed: sam['skip_if_ocr_needed'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['selection_grower'] = sg_meta_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Selection Grower meta has been loaded')
  }

  loadNewSelectionGrowerMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['selection_grower'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'selection_grower_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      direction: 'south',
      offsets: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      },
      colors: [],
      capture_grid: false,
      capture_form: false,
      merge_response: true,
      tie_grid_to_selected_area: true,
      row_column_threshold: 2,
      ocr_job_id: '',
      usage_mode: 'color_projection',
      debug: false,
      skip_if_ocr_needed: false,
    })
  }

  getSelectionGrowerMetaFromState() {
    const meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
      direction: this.state.direction,
      offsets: this.state.offsets,
      colors: this.state.colors,
      capture_grid: this.state.capture_grid,
      capture_form: this.state.capture_form,
      merge_response: this.state.merge_response,
      tie_grid_to_selected_area: this.state.tie_grid_to_selected_area,
      row_column_threshold: this.state.row_column_threshold,
      ocr_job_id: this.state.ocr_job_id,
      usage_mode: this.state.usage_mode,
      debug: this.state.debug,
      skip_if_ocr_needed: this.state.skip_if_ocr_needed,
    }
    return meta
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'selection_grower',
      this.getSelectionGrowerMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((meta) => {
      this.props.saveScannerToDatabase(
        'selection_grower',
        meta,
        (()=>{this.props.displayInsightsMessage('Seletion Grower has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'selection_grower_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildSkipIfOcrNeededField() {
    let checked_value = ''
    if (this.state.skip_if_ocr_needed) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('skip_if_ocr_needed', !this.state.skip_if_ocr_needed)}
          />
        </div>
        <div className='d-inline'>
          Skip If Ocr Needed
        </div>
      </div>
    )
  }

  buildDebugField() {
    let checked_value = ''
    if (this.state.debug) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('debug', !this.state.debug)}
          />
        </div>
        <div className='d-inline'>
          Debug
        </div>
      </div>
    )
  }

  buildDirectionField() {
    const directions = ['south', 'west']
    return (
      <div className='border-top ml-2'>
        <div className='h5'>
          Direction
        </div>
        <div className='font-italic'>
          these indicate which direction you intend to grow the selection
        </div>
        {directions.map((direction, index) => {
          const display_title = direction.charAt(0).toUpperCase() + direction.slice(1)
          return (
            <div key={index}>
              <div 
                className='d-inline'
              >
                <input
                  className='ml-2 mr-2 mt-1'
                  name='selection_grower_direction'
                  type='radio'
                  value={direction}
                  checked={this.state.direction === direction}
                  onChange={() => this.setLocalStateVar('direction', direction)}
                />
              </div>
              <div className='d-inline'>
                {display_title}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  buildTieGridToSelectedAreaField() {
    let checked_val = ''
    if (this.state.tie_grid_to_selected_area) {
      checked_val = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input 
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar('tie_grid_to_selected_area', !this.state.tie_grid_to_selected_area)}
          />
        </div>
        <div className='d-inline'>
          Tie Grid to Selected Area
        </div>
      </div>
    )
  }

  buildMergeResponseField() {
    let checked_val = ''
    if (this.state.merge_response) {
      checked_val = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input 
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar('merge_response', !this.state.merge_response)}
          />
        </div>
        <div className='d-inline'>
          Merge Response with Input 
        </div>
      </div>
    )
  }

  buildCaptureFormField() {
    let checked_val = ''
    if (this.state.capture_form) {
      checked_val = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input 
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar('capture_form', !this.state.capture_form)}
          />
        </div>
        <div className='d-inline'>
          Capture Form
        </div>
      </div>
    )
  }

  buildCaptureGridField() {
    let checked_val = ''
    if (this.state.capture_grid) {
      checked_val = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input 
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar('capture_grid', !this.state.capture_grid)}
          />
        </div>
        <div className='d-inline'>
          Capture Grid
        </div>
      </div>
    )
  }

  setOffset(direction, value) {
    let deepCopyOffs = JSON.parse(JSON.stringify(this.state.offsets))
    deepCopyOffs[direction] = value
    this.setLocalStateVar('offsets', deepCopyOffs)
  }

  buildRowColumnThresholdField() {
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            size='3'
            value={this.state.row_column_threshold}
            onChange={(event) => this.setLocalStateVar('row_column_threshold', event.target.value)}
          />
        </div>
        <div className='d-inline'>
          Row Column Threshold
        </div>
      </div>
    )
  }

  buildOffsetsField() {
    const directions = ['north', 'south', 'east', 'west']
    return (
      <div className='border-top ml-2'>
        <div className='h5'>
          Offsets
        </div>
        <div className='font-italic'>
          these say how much extra pixels to add to the n/s/e/w edge of the source selected area
          to define the 'field of play' as you project in your intended direction
        </div>
        <div className='row'>
        {directions.map((direction, index) => {
          const id_name = 'set_offset_' + direction
          const display_title = direction.charAt(0).toUpperCase() + direction.slice(1)
          return (
            <div className='col-3 border-right border-left' key={index}>
              <div className='d-inline'>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={id_name}
                  size='3'
                  value={this.state.offsets[direction]}
                  onChange={(event) => this.setOffset(direction, event.target.value)}
                />
              </div>
              <div className='d-inline'>
                {display_title}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    )
  }

  buildOcrMatchIdField() {
    let ocr_matches = []
    ocr_matches.push({'': ''})
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['operation'] !== 'scan_ocr_threaded') {
        continue
      }
      const build_obj = {}
      const desc = job['description'] + ' ' + job['id'].slice(0,3) + '...'
      build_obj[job['id']] = desc
      ocr_matches.push(build_obj)
    }

    return buildLabelAndDropdown(
      ocr_matches,
      'Ocr Job Id',
      this.state.ocr_job_id,
      'ocr_job_id',
      ((value)=>{this.setLocalStateVar('ocr_job_id', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('selection_grower_attribute_value')
    const name_ele = document.getElementById('selection_grower_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
    this.setLocalStateVar('attributes', deepCopyAttributes)
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'selection_grower_attribute_name',
      'selection_grower_attribute_value',
      (()=>{this.doAddAttribute()})
    )
    const attribs_list = buildAttributesAsRows(
      this.state.attributes,
      ((value)=>{this.deleteAttribute(value)})
    )
    return (
      <div>
        {add_attr_row}
        {attribs_list}
      </div>
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['selection_grower']).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 
      'selection_grower', 
      this.props.buildTier1RunOptions, 
      this.props.submitInsightsJob,
      false
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'selection_grower',
      this.props.tier_1_scanners['selection_grower'],
      ((value)=>{this.deleteSelectionGrowerMeta(value)})
    )
  }

  deleteSelectionGrowerMeta(sam_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyMMs = deepCopyScanners['selection_grower']
    delete deepCopyMMs[sam_id]
    deepCopyScanners['selection_grower'] = deepCopyMMs
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (sam_id === this.props.current_ids['t1_scanner']['selection_grower']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['selection_grower'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Selection Grower was deleted')
  }

  clearSelectionGrowerMatches(scope) {
    return clearTier1Matches(
      'selection_grower',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['selection_grower'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      'selection_grower',
      ((a)=>{this.clearSelectionGrowerMatches(a)})
    )
  }

  setColorTolerance(color_key, tolerance_value) {
    let deepCopyColors = JSON.parse(JSON.stringify(this.state.colors))
    if (Object.keys(this.state.colors).includes(color_key)) {
      deepCopyColors[color_key]['tolerance'] = tolerance_value
      this.setLocalStateVar('colors', deepCopyColors)
    }
  }

  clearColor(color_key) {
    let deepCopyColors = JSON.parse(JSON.stringify(this.state.colors))
    delete deepCopyColors[color_key]
    this.setLocalStateVar('colors', deepCopyColors)
  }

  buildColorsField() {
    if (Object.keys(this.state.colors).length < 1) {
      return (
        <div className='font-italic'>
          no colors selected
        </div>
      )
    }

    return (
      <div className='col'>
        <div className='h5 row'>
          Colors
        </div>
        {Object.keys(this.state.colors).map((color_key, index) => {
          const color = this.state.colors[color_key]
          const color_string = 'rgb(' + color['value'].join(',') + ')'
          const div_style = {
            width:'50px',
            height:'50px',
            overflow: 'hidden',
            border: '2px solid black',
            backgroundColor: color_string,
          }
          const color_div = (
            <div style={div_style} />
          )
          return (
            <div key={index} className='row border-top mt-2'>
              <div className='col'>

                <div className='row mt-2 ml-2'>
                  <div className='col-1'>
                    {color_div}
                  </div>

                  <div className='col-3'>
                    <div className='d-inline'>
                      Tol
                    </div>
                    <div className='d-inline'>
                      <input
                        className='ml-2 mr-2 mt-1'
                        size='3'
                        value={color['tolerance']}
                        onChange={(event) => this.setColorTolerance(color_key, event.target.value)}
                      />
                      
                    </div>
                  </div>

                  <div className='col-1'>
                    <button
                      className='btn btn-link ml-2'
                      onClick={() => this.clearColor(color_key)}
                    >
                      clear
                    </button>
                  </div>

                </div>


              </div>
            </div>
          )
        })}

      </div>
    )
  }

  setUsageMode(the_usage_mode) {
    this.setLocalStateVar('usage_mode', the_usage_mode)
    if (the_usage_mode === 'color_projection') {
      document.getElementById('color_projection_fields').style.display = 'block'
      document.getElementById('grid_capture_fields').style.display = 'none'
    } else {
      document.getElementById('color_projection_fields').style.display = 'none'
      document.getElementById('grid_capture_fields').style.display = 'block'
    }
  }

  buildColorProjectionSection() {
    const add_color_centers_button = this.buildAddColorCentersButton()
    const colors_field = this.buildColorsField()
    return (
      <div className='col'>
        <div className='row h5 border-top border-bottom bg-gray'>
          <div 
            className='d-inline'
          >
            <input
              className='ml-2 mr-2 mt-1'
              name='selection_grower_usage_mode'
              type='radio'
              value='color_projection'
              checked={this.state.usage_mode === 'color_projection'}
              onChange={() => this.setUsageMode('color_projection')}
            />
          </div>
          <div className='d-inline'>
            Color Projection
          </div>
        </div>

        <div id='color_projection_fields'>
          <div className='row font-italic'>
            grow in a direction, subject to background and border colors
          </div>

          <div className='row mt-2'>
            {add_color_centers_button}
          </div>

          <div className='row mt-2'>
            {colors_field}
          </div>
        </div>
      </div>
    )
  }

  buildGridCaptureSection() {
    const row_column_threshold_field = this.buildRowColumnThresholdField()
    const capture_grid_field = this.buildCaptureGridField()
    const capture_form_field = this.buildCaptureFormField()
    const merge_response_field = this.buildMergeResponseField()
    const tie_grid_field = this.buildTieGridToSelectedAreaField()
    const ocr_id_field = this.buildOcrMatchIdField()
    const skip_if_ocr_needed_field = this.buildSkipIfOcrNeededField()
    return (
      <div className='col'>
        <div className='row h5 border-top border-bottom bg-gray'>
          <div 
            className='d-inline'
          >
            <input
              className='ml-2 mr-2 mt-1'
              name='selection_grower_usage_mode'
              type='radio'
              value='grid_capture'
              checked={this.state.usage_mode === 'grid_capture'}
              onChange={() => this.setUsageMode('grid_capture')}
            />
          </div>
          <div className='d-inline'>
            Grid Capture
          </div>
        </div>

        <div id='grid_capture_fields'>
          <div className='row font-italic'>
            grow in a direction to capture a box around a grid of data
          </div>

          <div className='row mt-2'>
            {row_column_threshold_field}
          </div>

          <div className='row mt-2'>
            {capture_grid_field}
          </div>

          <div className='row mt-2'>
            {capture_form_field}
          </div>

          <div className='row mt-2'>
            {merge_response_field}
          </div>

          <div className='row mt-2'>
            {tie_grid_field}
          </div>

          <div className='row mt-2'>
            {ocr_id_field}
          </div>

          <div className='row mt-2'>
            {skip_if_ocr_needed_field}
          </div>
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['selection_grower']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'selection_grower', false)
    const name_field = this.buildNameField()
    const attributes_list = this.buildAttributesList()
    const run_button = this.buildRunButtonWrapper()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const direction_field = this.buildDirectionField()
    const debug_field = this.buildDebugField()
    const offsets_field = this.buildOffsetsField()
    const header_row = makeHeaderRow(
      'selection grower',
      'selection_grower_body',
      (() => this.props.toggleShowVisibility('selection_grower'))
    )
    const color_projection_section = this.buildColorProjectionSection()
    const grid_capture_section = this.buildGridCaptureSection()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='selection_grower_body' 
                className='row collapse bg-light'
            >
              <div id='selection_grower_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {direction_field}
                </div>

                <div className='row mt-2'>
                  {offsets_field}
                </div>

                <div className='row ml-2 mt-4 mr-2'>
                  {color_projection_section}
                </div>

                <div className='row ml-2 mt-4 mr-2'>
                  {grid_capture_section}
                </div>

                <div className='row mt-2'>
                  {debug_field}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='selection_grower_database_search_attribute_name'
                    search_attribute_value_id='selection_grower_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='selection_grower'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default SelectionGrowerControls;

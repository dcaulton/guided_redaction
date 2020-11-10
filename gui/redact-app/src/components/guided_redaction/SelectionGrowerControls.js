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
      directions: {
        north: false,
        south: false,
        east: false,
        west: false,
      },
      offsets: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      },
      colors: [],
      capture_grid: false,
      ocr_job_id: '',
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getSelectionGrowerMetaFromState=this.getSelectionGrowerMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.addColorCenterCallback=this.addColorCenterCallback.bind(this)
    this.getColors=this.getColors.bind(this)
  }

  getColors() {
    return this.state.colors
  }

  addColorCenterCallback(clicked_coords) {
    let deepCopyColors = JSON.parse(JSON.stringify(this.state.colors))
    const the_id = 'color_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let build_obj = {
      'image': this.props.insights_image,
      'movie': this.props.movie_url,
      id: the_id,
      location: clicked_coords,
      tolerance: 25,
    }
    deepCopyColors.push(build_obj)
    this.setLocalStateVar('colors', deepCopyColors)
  }

  startAddColorCenters() {
    this.props.handleSetMode('selection_grower_add_color_center')
    this.props.displayInsightsMessage('specify a point with the color you want')
  }

  buildAddColorCentersButton() {
    return buildInlinePrimaryButton(
      'Add Color Centers',
      (()=>{this.startAddColorCenters()})
    )
  }

  componentDidMount() {
    this.props.addInsightsCallback('selection_grower_add_color_center', this.addColorCenterCallback)
    this.props.addInsightsCallback('getCurrentSGColors', this.getColors)
    this.loadNewSelectionGrowerMeta()
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
        directions: sam['directions'],
        offsets: sam['offsets'],
        colors: sam['colors'],
        capture_grid: sam['capture_grid'],
        ocr_job_id: sam['ocr_job_id'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['selection_grower'] = sg_meta_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Selection Grower meta has been loaded')
  }

  loadNewSelectionGrowerMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['selection_grower'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'selection_grower_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      attributes: {},
      scan_level: 'tier_1',
      directions: {
        north: false,
        south: false,
        east: false,
        west: false,
      },
      offsets: {
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      },
      colors: [],
      capture_grid: false,
      ocr_job_id: '',
    })
  }

  getSelectionGrowerMetaFromState() {
    const meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
      directions: this.state.directions,
      offsets: this.state.offsets,
      colors: this.state.colors,
      capture_grid: this.state.capture_grid,
      ocr_job_id: this.state.ocr_job_id,
    }
    return meta
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'selection_grower',
      this.getSelectionGrowerMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
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

  toggleDirections(direction_name) {
    const new_value = (!this.state.directions[direction_name])
    let deepCopyDirs = JSON.parse(JSON.stringify(this.state.directions))
    deepCopyDirs[direction_name] = new_value
    this.setLocalStateVar('directions', deepCopyDirs)
  }

  buildDirectionsField() {
    const directions = ['north', 'south', 'east', 'west']
    return (
      <div>
        <div className='h5'>
          Directions
        </div>
        {directions.map((direction, index) => {
          const id_name = 'toggle_dir_' + direction
          const display_title = direction.charAt(0).toUpperCase() + direction.slice(1)
          return (
            <div key={index}>
              <div className='d-inline'>
                <input
                  className='ml-2 mr-2 mt-1'
                  id={id_name}
                  checked={this.state.directions[direction]}
                  type='checkbox'
                  onChange={() => this.toggleDirections(direction)}
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

  buildOffsetsField() {
    const directions = ['north', 'south', 'east', 'west']
    return (
      <div>
        <div className='h5'>
          Offsets
        </div>
        {directions.map((direction, index) => {
          const id_name = 'set_offset_' + direction
          const display_title = direction.charAt(0).toUpperCase() + direction.slice(1)
          return (
            <div key={index}>
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
    )
  }

  buildOcrJobIdField() {
    let ocr_jobs = []
    for (let i=0; i < this.props.jobs.length; i++) {
      const job = this.props.jobs[i]
      if (job['operation'] != 'scan_ocr_threaded') {
        continue
      }
      const display_label = job['id'] + ':' + job['description']
      const td = {}
      td[job['id']] = display_label
      ocr_jobs.push(td)
    }

    return buildLabelAndDropdown(
      ocr_jobs,
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
    if (sam_id === this.props.tier_1_scanner_current_ids['selection_grower']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['selection_grower'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Selection Grower was deleted')
  }

  clearSelectionGrowerMatches(scope) {
    return clearTier1Matches(
      'selection_grower',
      this.props.tier_1_matches,
      this.props.tier_1_scanner_current_ids['selection_grower'],
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

  clearColorCenter(color_id) {
    let build_colors = []
    for (let i=0; i < this.state.colors.length; i++) {
      const color = this.state.colors[i]
      if (color['id']  !== color_id) {
        build_colors.push(color)
      }
    }
    this.setLocalStateVar('colors', build_colors)
  }

  updateColorProperty(color_id, property_name, property_value) {
    let deepCopyColors = JSON.parse(JSON.stringify(this.state.colors))
    let build_colors = []
    for (let i=0; i < this.state.colors.length; i++) {
      const color_obj = deepCopyColors[i]
      if (color_obj['id'] === color_id) {
        color_obj[property_name] = property_value
      }
      build_colors.push(color_obj)
    }
    this.setLocalStateVar('colors', build_colors)
  }

  buildColorsField() {
    return (
      <div className='col'>
        <div className='h5 row'>
          Colors
        </div>
        {this.state.colors.map((color_obj, index) => {
          const mar_left = '-' + String(color_obj['location'][0] - 25) + 'px'
          const mar_top = '-' + String(color_obj['location'][1] - 25) + 'px'
          const div_style = {
            width:'50px',
            height:'50px',
            overflow: 'hidden',
            border: '2px solid black',
          }
          const img_style = {
            marginLeft: mar_left,
            marginTop: mar_top,
          }
          const color_img = (
            <div 
              style={div_style}
            >
              <img
                style={img_style}
                src={this.props.insights_image}
                alt='whatever'
              />
            </div>
          )
          return (
            <div key={index} className='row border-top mt-2'>
              <div className='col'>

                <div className='row mt-2'>
                  <div className='col-3'>
                    {color_obj.id}
                  </div>
                  <div className='col-1'>
                    {color_img}
                  </div>
                </div>

                <div className='row mt-2'>
                  <div className='d-inline'>
                    <input
                      size='4'
                      value={color_obj['tolerance']}
                      onChange={(event) => this.updateColorProperty(color_obj.id, 'tolerance', event.target.value)}
                    />
                  </div>
                  <div className='d-inline'>
                    Color Tolerance
                  </div>

                </div>

                <div className='row'>
                  <div className='col-2'>
                    <button
                      className='btn btn-primary p-1 m-1'
                      onClick={() => this.clearColorCenter(color_obj.id)}
                    >
                      Delete
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
    const directions_field = this.buildDirectionsField()
    const offsets_field = this.buildOffsetsField()
    const colors_field = this.buildColorsField()
    const capture_grid_field = this.buildCaptureGridField()
    const ocr_id_field = this.buildOcrJobIdField()
    const add_color_centers_button = this.buildAddColorCentersButton()
    const header_row = makeHeaderRow(
      'selection grower',
      'selection_grower_body',
      (() => this.props.toggleShowVisibility('selection_grower'))
    )

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
                  {add_color_centers_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {directions_field}
                </div>

                <div className='row mt-2'>
                  {offsets_field}
                </div>

                <div className='row mt-2'>
                  {capture_grid_field}
                </div>

                <div className='row mt-2'>
                  {ocr_id_field}
                </div>

                <div className='row mt-2'>
                  {colors_field}
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

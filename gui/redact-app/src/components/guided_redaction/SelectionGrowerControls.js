import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, 
  buildLabelAndTextInput,
  buildInlinePrimaryButton, 
  buildTier1LoadButton, 
  buildTier1DeleteButton,
  makeHeaderRow,
  buildAttributesAsRows,
  buildIdString,
  clearTier1Matches,
  buildClearMatchesButton,
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
      min_score: 15,
      colors: {
      },
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getSelectionGrowerMetaFromState=this.getSelectionGrowerMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.addColorCenterCallback=this.addColorCenterCallback.bind(this)
  }

  addColorCenterCallback(clicked_coords) {
  console.log('YI', clicked_coords)
// we're gonna need to do an api call to get this.  Trying to load the image offscreen gives us cors headaches
//what if I got the image as a data url?
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
        min_score: sam['min_score'],
        colors: sam['colors'],
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
      min_score: 15,
      colors: {},
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
      min_score: this.state.min_score,
      colors: this.state.colors,
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

  buildMinScoreField() {
    return buildLabelAndTextInput(
      this.state.min_score,
      'Min Score',
      'selection_grower_min_score',
      'min_score',
      4,
      ((value)=>{this.setLocalStateVar('min_score', value)})
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

  buildRunButton() {
    if (!Object.keys(this.props.tier_1_scanners['selection_grower']).includes(this.state.id)) {
      return ''
    }
    const tier_1_template_run_options = this.props.buildTier1RunOptions('template', 'selection_grower_t1_template')
    const tier_1_sa_run_options = this.props.buildTier1RunOptions('selected_area', 'selection_grower_t1_selected_area')
    const tier_1_osa_run_options = this.props.buildTier1RunOptions('ocr_scene_analysis', 'selection_grower_t1_osa')
    const tier_1_mesh_match_run_options = this.props.buildTier1RunOptions('mesh_match', 'selection_grower_t1_mesh_match')

    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanSelectionGrowerDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanSelectionGrowerDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('selection_grower_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('selection_grower_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('selection_grower_all_movies')}
          >
            All Movies
          </button>
          {tier_1_template_run_options}
          {tier_1_sa_run_options}
          {tier_1_osa_run_options}
          {tier_1_mesh_match_run_options}
        </div>
      </div>
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

  render() {
    if (!this.props.visibilityFlags['selection_grower']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'selection_grower', false)
    const name_field = this.buildNameField()
    const min_score_field = this.buildMinScoreField()
    const attributes_list = this.buildAttributesList()
    const run_button = this.buildRunButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const directions_field = this.buildDirectionsField()
    const offsets_field = this.buildOffsetsField()
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
                  {add_color_centers_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {min_score_field}
                </div>

                <div className='row mt-2'>
                  {directions_field}
                </div>

                <div className='row mt-2'>
                  {offsets_field}
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

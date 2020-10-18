import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'
import {
  buildAttributesAddRow, buildLabelAndTextInput, buildLabelAndDropdown,
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
      min_score: 15,
      mesh_size: 50,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getSelectionGrowerMetaFromState=this.getSelectionGrowerMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  componentDidMount() {
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
        min_score: sam['min_score'],
        mesh_size: sam['mesh_size'],
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
      min_score: 15,
      mesh_size: 50,
    })
  }

  getSelectionGrowerMetaFromState() {
    const meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
      min_score: this.state.min_score,
      mesh_size: this.state.mesh_size,
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

  buildMeshSizeField() {
    return buildLabelAndTextInput(
      this.state.mesh_size,
      'Mesh Size',
      'selection_grower_mesh_size',
      'mesh_size',
      4,
      ((value)=>{this.setLocalStateVar('mesh_size', value)})
    )
  }

  buildScanLevelDropdown2() {
    const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (select only)'},
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'selection_grower_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
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
    const mesh_size_field = this.buildMeshSizeField()
    const attributes_list = this.buildAttributesList()
    const scan_level_dropdown = this.buildScanLevelDropdown2()
    const run_button = this.buildRunButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
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
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {min_score_field}
                </div>

                <div className='row mt-2'>
                  {mesh_size_field}
                </div>

                <div className='row mt-2'>
                  {scan_level_dropdown}
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

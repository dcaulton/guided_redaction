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


class DataSifterControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      fake_data: 'true',
      app_dictionary: {},
      scale: '1:1',
      attributes: {},
      scan_level: 'tier_2',
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getDataSifterFromState=this.getDataSifterFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }


  showSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  componentDidMount() {
    this.loadNewDataSifter()
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
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.loadDataSifter(value)})
    )
  }

  loadDataSifter(data_sifter_id) {
    if (!data_sifter_id) {
      this.loadNewDataSifter()
    } else {
      const sam = this.props.tier_1_scanners['data_sifter'][data_sifter_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        fake_data: sam['fake_data'],
        app_dictionary: sam['app_dictionary'],
        scale: sam['scale'],
        attributes: sam['attributes'],
        scan_level: sam['scan_level'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['data_sifter'] = data_sifter_id
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Data sifter has been loaded')
  }

  loadNewDataSifter() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
    deepCopyIds['data_sifter'] = ''
    this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    const the_id = 'data_sifter_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      fake_data: 'yes',
      app_dictionary: {},
      scale: '1:1',
      attributes: {},
      scan_level: 'tier_2',
    })
  }

  getDataSifterFromState() {
    const data_sifter = {                                                          
      id: this.state.id,
      name: this.state.name,
      fake_data: this.state.fake_data,
      app_dictionary: this.state.app_dictionary,
      scale: this.state.scale,
      attributes: this.state.attributes,
      scan_level: this.state.scan_level,
    }
    return data_sifter
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'data_sifter',
      this.getDataSifterFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.tier_1_scanner_current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((data_sifter) => {
      this.props.saveScannerToDatabase(
        'data_sifter',
        data_sifter,
        (()=>{this.props.displayInsightsMessage('Selected Area has been saved to database')})
      )
    }))
  }

  buildScaleDropdown() {
    const values = [
      {'1:1': 'actual image scale only'},
      {'match_trigger': 'match trigger'}
    ]
    return buildLabelAndDropdown(
      values,
      'Scale',
      this.state.scale,
      'data_sifter_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildFakeDataDropdown() {
    if (this.state.scan_level !== 'tier_2') {
      return 
    }
    const values = [
      {'yes': 'yes'},
      {'no': 'no'},
    ]
    return buildLabelAndDropdown(
      values,
      'Generate Fake Data',
      this.state.fake_data,
      'data_sifter_fake_data',
      ((value)=>{this.setLocalStateVar('fake_data', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'data_sifter_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildScanLevelDropdown2() {
    const scan_level_dropdown = [
      {'tier_1': 'Tier 1 (select only)'},
      {'tier_2': 'Tier 2 (select and redact)'}
    ]

    return buildLabelAndDropdown(
      scan_level_dropdown,
      'Scan Level',
      this.state.scan_level,
      'data_sifter_scan_level',
      ((value)=>{this.setLocalStateVar('scan_level', value)})
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was added')
  }

  doAddAttribute() {
    const value_ele = document.getElementById('data_sifter_attribute_value')
    const name_ele = document.getElementById('data_sifter_attribute_name')
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
      this.setState(
      {
        attributes: deepCopyAttributes,
      },
      this.doSave
    )
    this.props.displayInsightsMessage('Attribute was deleted')
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'data_sifter_attribute_name',
      'data_sifter_attribute_value',
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

  buildBuildButton() {
    const t1_sa_build_options = this.props.buildTier1RunOptions(
      'selected_area', 
      'data_sifter_build_t1_selected_area'
    )
    if (!t1_sa_build_options) {
      return
    }
    const data_sifter_id = this.props.tier_1_scanner_current_ids['data_sifter']
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(data_sifter_id)) {
      return
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanDataSifterBuildDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Build
        </button>
        <div className='dropdown-menu' aria-labelledby='scanDataSifterBuildDropdownButton'>
          {t1_sa_build_options}
        </div>
      </div>
    )
  }

  buildRunButton() {
    if (!Object.keys(this.props.tier_1_scanners['data_sifter']).includes(this.state.id)) {
      return ''
    }
    const data_sifter = this.props.tier_1_scanners['data_sifter'][this.state.id]
    if (!Object.keys(data_sifter.app_dictionary).includes('phrases')) {
      return ''
    }
    if (data_sifter.app_dictionary['phrases'].length === 0) {
      return ''
    }
    const tier_1_template_run_options = this.props.buildTier1RunOptions(
      'template', 'data_sifter_t1_template'
    )
    const tier_1_selected_area_run_options = this.props.buildTier1RunOptions(
      'selected_area', 'data_sifter_t1_selected_area'
    )
    const tier_1_ocr_run_options = this.props.buildTier1RunOptions(
      'ocr', 'data_sifter_t1_ocr'
    )
    const tier_1_osa_run_options = this.props.buildTier1RunOptions(
      'ocr_scene_analysis', 'data_sifter_t1_osa'
    )

    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanDataSifterDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanDataSifterDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('data_sifter_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('data_sifter_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('data_sifter_all_movies')}
          >
            All Movies
          </button>
          {tier_1_template_run_options}
          {tier_1_selected_area_run_options}
          {tier_1_ocr_run_options}
          {tier_1_osa_run_options}
        </div>
      </div>
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'data_sifter',
      this.props.tier_1_scanners['data_sifter'],
      ((value)=>{this.deleteDataSifter(value)})
    )
  }

  deleteDataSifter(sam_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyDataSifters = deepCopyScanners['data_sifter']
    delete deepCopyDataSifters[sam_id]
    deepCopyScanners['data_sifter'] = deepCopyDataSifters
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (sam_id === this.props.tier_1_scanner_current_ids['data_sifter']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.tier_1_scanner_current_ids))
      deepCopyIds['data_sifter'] = ''
      this.props.setGlobalStateVar('tier_1_scanner_current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Data Sifter was deleted')
  }

  clearMatches(scope) {
    return clearTier1Matches(
      'data_sifter',
      this.props.tier_1_matches,
      this.props.tier_1_scanner_current_ids['data_sifter'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    const match_keys = Object.keys(this.props.tier_1_matches['data_sifter'])
    if (match_keys.length === 0) {
      return
    }
    return buildClearMatchesButton(
      'data_sifter',
      ((a)=>{this.clearMatches(a)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['data_sifter']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'data_sifter', false)
    const name_field = this.buildNameField()
    const scale_dropdown = this.buildScaleDropdown()
    const fake_data_dropdown = this.buildFakeDataDropdown()
    const attributes_list = this.buildAttributesList()
    const scan_level_dropdown = this.buildScanLevelDropdown2()
    const run_button = this.buildRunButton()
    const build_button = this.buildBuildButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const header_row = makeHeaderRow(
      'data sifter',
      'data_sifter_body',
      (() => this.props.toggleShowVisibility('data_sifter'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='data_sifter_body' 
                className='row collapse bg-light'
            >
              <div id='data_sifter_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {build_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {scale_dropdown}
                </div>

                <div className='row mt-2'>
                  {fake_data_dropdown}
                </div>

                <div className='row mt-2'>
                  {scan_level_dropdown}
                </div>

                <div className='row mt-1 mr-1 ml-1 border-top'>
                  {attributes_list}
                </div>

                <div className='row mt-3 ml-1 mr-1'>
                  <ScannerSearchControls
                    search_attribute_name_id='data_sifter_database_search_attribute_name'
                    search_attribute_value_id='data_sifter_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='data_sifter'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default DataSifterControls;

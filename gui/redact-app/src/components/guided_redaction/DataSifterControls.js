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
      scale: '1:1',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_2',
      unsaved_changes: false,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getCurrentOriginLocation=this.getCurrentOriginLocation.bind(this)
    this.addOriginLocation=this.addOriginLocation.bind(this)
    this.getDataSifterFromState=this.getDataSifterFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }


  showSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  addOriginLocation(origin_coords) {
    this.setState({
      origin_entity_location: origin_coords
    })
    this.props.displayInsightsMessage('data sifter origin location was added,')
    this.props.handleSetMode('')
  }

  getCurrentOriginLocation() {
    return this.state.origin_entity_location
  }

  componentDidMount() {
    this.props.addInsightsCallback('getCurrentDataSifterOriginLocation', this.getCurrentOriginLocation)
    this.props.addInsightsCallback('add_ds_origin_location_1', this.addOriginLocation)
    this.loadNewDataSifter()
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    this.setState({
      [var_name]: var_value,
      unsaved_changes: true,
    },
    when_done())
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
        scale: sam['scale'],
        attributes: sam['attributes'],
        origin_entity_type: sam['origin_entity_type'],
        origin_entity_id: sam['origin_entity_id'],
        origin_entity_location: sam['origin_entity_location'],
        scan_level: sam['scan_level'],
        unsaved_changes: false,
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
      scale: '1:1',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_2',
      unsaved_changes: false,
    })
  }

  getDataSifterFromState() {
    const data_sifter = {                                                          
      id: this.state.id,
      name: this.state.name,
      fake_data: this.state.fake_data,
      scale: this.state.scale,
      attributes: this.state.attributes,
      origin_entity_type: this.state.origin_entity_type,
      origin_entity_id: this.state.origin_entity_id,
      origin_entity_location: this.state.origin_entity_location,
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

  buildOriginEntityTypeDropdown() {
    const values = [
      {'adhoc': 'ad hoc'},
      {'template_anchor': 'template anchor'}
    ]
    return buildLabelAndDropdown(
      values,
      'Origin Entity Type',
      this.state.origin_entity_type,
      'data_sifter_origin_entity_type',
      ((value)=>{this.setLocalStateVar('origin_entity_type', value)})
    )
  }

  buildOriginEntityIdDropdown() {
    if (this.state.origin_entity_type === 'adhoc') {
      return ''
    }
    let t1_temp_ids = []
    let t2_temp_ids = []
    let adhoc_option = (<option value=''></option>)
    if (this.state.origin_entity_type === 'template_anchor') {
      for (let i=0; i < Object.keys(this.props.tier_1_scanners['template']).length; i++) {
        const template_id = Object.keys(this.props.tier_1_scanners['template'])[i]
        const template = this.props.tier_1_scanners['template'][template_id]
        if (template['scan_level'] === 'tier_1') {
          t1_temp_ids.push(template_id)
        }
        if (template['scan_level'] === 'tier_2') {
          t2_temp_ids.push(template_id)
        }
      }
      adhoc_option = ''
    }

    let anchor_descs = {}
    let anchor_keys = []
    for (let i=0; i < Object.keys(this.props.tier_1_scanners['template']).length; i++) {
      const template_id = Object.keys(this.props.tier_1_scanners['template'])[i]
      const template = this.props.tier_1_scanners['template'][template_id]
      let temp_type = 'unknown template'
      if (t1_temp_ids.includes(template_id)) {
        temp_type = 'Tier 1 template'
      } 
      if (t2_temp_ids.includes(template_id)) {
        temp_type = 'Tier 2 template'
      }
      for (let j=0; j < template['anchors'].length; j++) {
        const anchor = template['anchors'][j]
        const desc_string = temp_type + ':' + template['name'] + ', ' + anchor['id']
        anchor_keys.push(anchor['id'])
        anchor_descs[anchor['id']] = desc_string
      }
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          Origin Entity Id
        </div>
        <div className='d-inline ml-2'>
          <select
              name='data_sifter_origin_entity_id'
              value={this.state.origin_entity_id}
              onChange={(event) => this.setLocalStateVar('origin_entity_id', event.target.value)}
          >
            <option value=''></option>
            {adhoc_option}
            {anchor_keys.map((anchor_id, index) => {
              const anchor_desc = anchor_descs[anchor_id]
              const the_key = 'sa_origin_anchor_id_' + index.toString()
              return (
                <option value={anchor_id} key={the_key}>{anchor_desc}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  setAttribute(name, value) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    deepCopyAttributes[name] = value
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
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
    this.setState({
      attributes: deepCopyAttributes,
      unsaved_changes: true,
    })
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

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
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
    const tier_1_template_run_options = this.props.buildTier1RunOptions('template', 'data_sifter_t1_template')
    const tier_1_selected_area_run_options = this.props.buildTier1RunOptions('selected_area', 'data_sifter_t1_selected_area')
    const tier_1_ocr_run_options = this.props.buildTier1RunOptions('ocr', 'data_sifter_t1_ocr')
    const tier_1_osa_run_options = this.props.buildTier1RunOptions('ocr_scene_analysis', 'data_sifter_t1_osa')
    const tier_1_telemetry_run_options = this.props.buildTier1RunOptions('telemetry', 'data_sifter_t1_telemetry')

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
          {tier_1_telemetry_run_options}
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

  startAddOriginLocation() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_ds_origin_location_1')
  }

  buildAddOriginLocationButton() {
    return buildInlinePrimaryButton(
      'Set Origin Location',
      (()=>{this.startAddOriginLocation()})
    )
  }

  buildClearOriginLocationButton() {
    return buildInlinePrimaryButton(
      'Clear Origin Location',
      (()=>{this.clearOriginLocation()})
    )
  }

  clearOriginLocation() {
    this.setState({
      origin_entity_location: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Origin location has been cleared')
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
    const id_string = buildIdString(this.state.id, 'data_sifter', this.state.unsaved_changes)
    const name_field = this.buildNameField()
    const scale_dropdown = this.buildScaleDropdown()
    const fake_data_dropdown = this.buildFakeDataDropdown()
    const attributes_list = this.buildAttributesList()
    const scan_level_dropdown = this.buildScanLevelDropdown2()
    const origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    const origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    const add_origin_location_button = this.buildAddOriginLocationButton()
    const clear_origin_location_button = this.buildClearOriginLocationButton()
    const save_button = this.buildSaveButton()
    const run_button = this.buildRunButton()
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
                  {save_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {add_origin_location_button}
                  {clear_origin_location_button}
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

                <div className='row mt-2'>
                  {origin_entity_type_dropdown}
                </div>

                <div className='row mt-2'>
                  {origin_entity_id_dropdown}
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

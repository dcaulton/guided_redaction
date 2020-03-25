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


class SelectedAreaControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      select_type: 'arrow',
      scale: '1:1',
      interior_or_exterior: 'interior',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_2',
      areas: [],
      minimum_zones: [],
      tolerance: 5,
      unsaved_changes: false,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.addAreaCoordsCallback=this.addAreaCoordsCallback.bind(this)
    this.getCurrentSelectedAreaCenters=this.getCurrentSelectedAreaCenters.bind(this)
    this.getCurrentSelectedAreaMinimumZones=this.getCurrentSelectedAreaMinimumZones.bind(this)
    this.getCurrentSelectedAreaOriginLocation=this.getCurrentSelectedAreaOriginLocation.bind(this)
    this.addOriginLocation=this.addOriginLocation.bind(this)
    this.addMinimumZonesCallback1=this.addMinimumZonesCallback1.bind(this)
    this.addMinimumZonesCallback2=this.addMinimumZonesCallback2.bind(this)
    this.getSelectedAreaMetaFromState=this.getSelectedAreaMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  addMinimumZonesCallback1(click_coords) {
    this.setState({
      first_click_coords: click_coords,
    })
    this.props.handleSetMode('selected_area_minimum_zones_2')
  }

  addMinimumZonesCallback2(click_coords) {
    const zone_id = 'selected_area_minimum_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_zone = {
        'id': zone_id,
        'start': this.state.first_click_coords,
        'end': click_coords,
    }
    let deepCopyMinimumZones = JSON.parse(JSON.stringify(this.state.minimum_zones))
    deepCopyMinimumZones.push(the_zone)
    this.setState({
      minimum_zones: deepCopyMinimumZones,
      unsaved_changes: true,
    })
    this.props.handleSetMode('selected_area_minimum_zones_1')
  }

  addOriginLocation(origin_coords) {
    this.setState({
      origin_entity_location: origin_coords
    })
    this.props.displayInsightsMessage('selected area origin location was added,')
    this.props.handleSetMode('')
  }

  getCurrentSelectedAreaCenters() {
    return this.state.areas
  }

  getCurrentSelectedAreaMinimumZones() {
    return this.state.minimum_zones
  }

  getCurrentSelectedAreaOriginLocation() {
    return this.state.origin_entity_location
  }

  componentDidMount() {
    this.props.addInsightsCallback('selected_area_area_coords_1', this.addAreaCoordsCallback)
    this.props.addInsightsCallback('selected_area_minimum_zones_1', this.addMinimumZonesCallback1)
    this.props.addInsightsCallback('selected_area_minimum_zones_2', this.addMinimumZonesCallback2)
    this.props.addInsightsCallback('getCurrentSelectedAreaCenters', this.getCurrentSelectedAreaCenters)
    this.props.addInsightsCallback('getCurrentSelectedAreaMinimumZones', this.getCurrentSelectedAreaMinimumZones)
    this.props.addInsightsCallback('getCurrentSelectedAreaOriginLocation', this.getCurrentSelectedAreaOriginLocation)
    this.props.addInsightsCallback('add_sa_origin_location_1', this.addOriginLocation)
  }

  addAreaCoordsCallback(the_coords) {
    const area_id = 'selected_area_subarea_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_area = {
        'id': area_id,
        'center': the_coords,
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
    }
    let deepCopyAreas = JSON.parse(JSON.stringify(this.state.areas))
    deepCopyAreas.push(the_area)
    this.setState({
      areas: deepCopyAreas,
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('selected area center was added, add another if you wish')
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
      'selected_area',
      this.props.selected_area_metas,
      ((value)=>{this.loadSelectedAreaMeta(value)})
    )
  }

  loadSelectedAreaMeta(selected_area_meta_id) {
    if (!selected_area_meta_id) {
      this.loadNewSelectedAreaMeta()
    } else {
      const sam = this.props.selected_area_metas[selected_area_meta_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        select_type: sam['select_type'],
        scale: sam['scale'],
        interior_or_exterior: sam['interior_or_exterior'],
        attributes: sam['attributes'],
        origin_entity_type: sam['origin_entity_type'],
        origin_entity_id: sam['origin_entity_id'],
        origin_entity_location: sam['origin_entity_location'],
        scan_level: sam['scan_level'],
        areas: sam['areas'],
        minimum_zones : sam['minimum_zones'],
        tolerance: sam['tolerance'],
        unsaved_changes: false,
      })
    }
    this.props.setGlobalStateVar('current_selected_area_meta_id', selected_area_meta_id)
    this.props.displayInsightsMessage('Selected area meta has been loaded')
  }

  loadNewSelectedAreaMeta() {
    this.props.setGlobalStateVar('current_selected_area_meta_id', '')
    this.setState({
      id: '',
      name: '',
      select_type: 'arrow',
      scale: '1:1',
      interior_or_exterior: 'interior',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_2',
      areas: [],
      minimum_zones: [],
      tolerance: 5,
      unsaved_changes: false,
    })
  }

  getSelectedAreaMetaFromState() {
    const selected_area_meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      select_type: this.state.select_type,
      scale: this.state.scale,
      interior_or_exterior: this.state.interior_or_exterior,
      attributes: this.state.attributes,
      origin_entity_type: this.state.origin_entity_type,
      origin_entity_id: this.state.origin_entity_id,
      origin_entity_location: this.state.origin_entity_location,
      scan_level: this.state.scan_level,
      areas: this.state.areas,
      minimum_zones: this.state.minimum_zones,
      tolerance: this.state.tolerance,
    }
    return selected_area_meta
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'selected_area_meta',
      this.state.name,
      this.getSelectedAreaMetaFromState,
      this.props.displayInsightsMessage,
      this.props.selected_area_metas,
      'selected_area_metas',
      'current_selected_area_meta_id',
      this.setLocalStateVar,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((selected_area_meta) => {
      this.props.saveScannerToDatabase(
        'selected_area_meta',
        selected_area_meta,
        (()=>{this.props.displayInsightsMessage('Selected Area Meta has been saved to database')})
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
      'selected_area_scale',
      ((value)=>{this.setLocalStateVar('scale', value)})
    )
  }

  buildSelectTypeDropdown() {
    const values = [
      {'flood': 'flood simple'},
      {'flood_true': 'flood'},
      {'arrow': 'arrow simple'},
      {'arrow_chain': 'arrow chain'},
    ]
    return buildLabelAndDropdown(
      values,
      'Select Type',
      this.state.select_type,
      'selected_area_select_type',
      ((value)=>{this.setLocalStateVar('select_type', value)})
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'selected_area_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildToleranceField() {
    return buildLabelAndTextInput(
      this.state.tolerance,
      'Tolerance',
      'selected_area_tolerance',
      'tolerance',
      4,
      ((value)=>{this.setLocalStateVar('tolerance', value)})
    )
  }

  buildInteriorOrExteriorDropdown() {
    const values = [
      {'interior': 'interior'},
      {'exterior': 'exterior'}
    ]
    return buildLabelAndDropdown(
      values,
      'Interior or Exterior',
      this.state.interior_or_exterior,
      'selected_area_interior_or_exterior',
      ((value)=>{this.setLocalStateVar('interior_or_exterior', value)})
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
      'selected_area_scan_level',
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
      'selected_area_origin_entity_type',
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
      for (let i=0; i < Object.keys(this.props.templates).length; i++) {
        const template_id = Object.keys(this.props.templates)[i]
        const template = this.props.templates[template_id]
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
    for (let i=0; i < Object.keys(this.props.templates).length; i++) {
      const template_id = Object.keys(this.props.templates)[i]
      const template = this.props.templates[template_id]
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
              name='selected_area_origin_entity_id'
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
    const value_ele = document.getElementById('selected_area_attribute_value')
    const name_ele = document.getElementById('selected_area_attribute_name')
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
      'selected_area_attribute_name',
      'selected_area_attribute_value',
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

  startAddSelectedAreas() {
    this.props.handleSetMode('selected_area_area_coords_1')
    this.props.displayInsightsMessage('specify the center of the selected area')
  }

  startAddMinimumZones() {
    this.props.handleSetMode('selected_area_minimum_zones_1')
    this.props.displayInsightsMessage('specify the upper left corner of the minimum zone')
  }

  buildAddAreaCoordsButton() {
    return buildInlinePrimaryButton(
      'Add Area Center',
      (()=>{this.startAddSelectedAreas()})
    )
  }

  buildAddMinimumZonesButton() {
    return buildInlinePrimaryButton(
      'Add Minimum Zones',
      (()=>{this.startAddMinimumZones()})
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

  buildRunButton() {
    if (!this.state.id) {
      return ''
    }
    const tier_1_template_run_options = this.props.buildTier1RunOptions('template', 'current_selected_area_meta_tier1')
    const tier_1_selected_area_run_options = this.props.buildTier1RunOptions('selected_area', 'current_selected_area_meta_tier1')
    const tier_1_ocr_run_options = this.props.buildTier1RunOptions('ocr', 'current_selected_area_meta_tier1')
    const tier_1_telemetry_run_options = this.props.buildTier1RunOptions('telemetry', 'current_selected_area_meta_tier1')


    const movie_set_run_options = this.props.buildMovieSetOptions('current_selected_area_meta_movie_set')

    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='scanSelectedAreaDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div className='dropdown-menu' aria-labelledby='scanSelectedAreaDropdownButton'>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('current_selected_are_meta_current_frame')}
          >
            Frame
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('current_selected_area_meta_current_movie')}
          >
            Movie
          </button>
          <button className='dropdown-item'
              onClick={() => this.props.submitInsightsJob('current_selected_area_meta_all_movies')}
          >
            All Movies
          </button>
          {movie_set_run_options}
          {tier_1_template_run_options}
          {tier_1_selected_area_run_options}
          {tier_1_ocr_run_options}
          {tier_1_telemetry_run_options}
        </div>
      </div>
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'selected_area',
      this.props.selected_area_metas,
      ((value)=>{this.deleteSelectedAreaMeta(value)})
    )
  }

  deleteSelectedAreaMeta(sam_id) {
    let deepCopySelectedAreaMetas = JSON.parse(JSON.stringify(this.props.selected_area_metas))
    delete deepCopySelectedAreaMetas[sam_id]
    this.props.setGlobalStateVar('selected_area_metas', deepCopySelectedAreaMetas)
    if (sam_id === this.props.current_selected_area_meta_id) {
      this.props.setGlobalStateVar('current_selected_area_meta_id', '')
    }
    this.props.displayInsightsMessage('Selected Area Meta was deleted')
  }

  buildClearAreasButton() {
    return buildInlinePrimaryButton(
      'Clear Area Centers',
      (()=>{this.clearAnchors()})
    )
  }
  
  buildClearMinimumZonesButton() {
    return buildInlinePrimaryButton(
      'Clear Minimum Zones',
      (()=>{this.clearMinimumZones()})
    )
  }
  
  startAddOriginLocation() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_sa_origin_location_1')
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

  clearAnchors() {
    this.setState({
      areas: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Area centers have been cleared')
  }

  clearMinimumZones() {
    this.setState({
      minimum_zones: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Minimum zones have been cleared')
  }

  clearSelectedAreaMatches(scope) {
    return clearTier1Matches(
      'selected_area',
      this.props.tier_1_matches,
      this.state.id,
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      'selected_area',
      ((a)=>{this.clearSelectedAreaMatches(a)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['selectedArea']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'selected area meta', this.state.unsaved_changes)
    const name_field = this.buildNameField()
    const tolerance_field = this.buildToleranceField()
    const scale_dropdown = this.buildScaleDropdown()
    const select_type_dropdown = this.buildSelectTypeDropdown()
    const interior_or_exterior_dropdown = this.buildInteriorOrExteriorDropdown()
    const attributes_list = this.buildAttributesList()
    const scan_level_dropdown = this.buildScanLevelDropdown2()
    const origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    const origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    const add_area_coords_button = this.buildAddAreaCoordsButton()
    const clear_area_coords_button = this.buildClearAreasButton()
    const add_minimum_zones_button = this.buildAddMinimumZonesButton()
    const clear_minimum_zones_button = this.buildClearMinimumZonesButton()
    const add_origin_location_button = this.buildAddOriginLocationButton()
    const clear_origin_location_button = this.buildClearOriginLocationButton()
    const save_button = this.buildSaveButton()
    const run_button = this.buildRunButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const header_row = makeHeaderRow(
      'selected area',
      'selected_area_body',
      (()=>{this.props.toggleShowVisibility('selectedArea')})
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='selected_area_body' 
                className='row collapse bg-light'
            >
              <div id='selected_area_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {add_area_coords_button}
                  {clear_area_coords_button}
                  {add_origin_location_button}
                  {clear_origin_location_button}
                </div>

                <div className='row mt-2'>
                  {add_minimum_zones_button}
                  {clear_minimum_zones_button}
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
                  {select_type_dropdown}
                </div>

                <div className='row mt-2'>
                  {interior_or_exterior_dropdown}
                </div>

                <div className='row mt-2'>
                  {tolerance_field}
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

                <div className='row mt-3 ml-1 mr-1 border-top'>
                  <ScannerSearchControls
                    search_attribute_name_id='selected_area_database_search_attribute_name'
                    search_attribute_value_id='selected_area_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='selected_area_meta'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default SelectedAreaControls;

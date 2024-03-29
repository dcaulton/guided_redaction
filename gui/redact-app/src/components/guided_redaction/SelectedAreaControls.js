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
  buildRunButton,
  setLocalT1ScannerStateVar,
  doTier1Save,
  } from './SharedControls'


class SelectedAreaControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      select_type: 'flood',
      merge: true,
      masks_always: false,
      interior_or_exterior: 'interior',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_1',
      areas: [],
      minimum_zones: [],
      maximum_zones: [],
      manual_zones: {},
      tolerance: 5,
      everything_direction: '',
      respect_source_dimensions: true,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.addAreaCoordsCallback=this.addAreaCoordsCallback.bind(this)
    this.getCurrentSelectedAreaCenters=this.getCurrentSelectedAreaCenters.bind(this)
    this.getCurrentSelectedAreaMinimumZones=this.getCurrentSelectedAreaMinimumZones.bind(this)
    this.getCurrentSelectedAreaMaximumZones=this.getCurrentSelectedAreaMaximumZones.bind(this)
    this.getCurrentSelectedAreaManualZones=this.getCurrentSelectedAreaManualZones.bind(this)
    this.getCurrentSelectedAreaOriginLocation=this.getCurrentSelectedAreaOriginLocation.bind(this)
    this.addOriginLocation=this.addOriginLocation.bind(this)
    this.addMinimumZonesCallback1=this.addMinimumZonesCallback1.bind(this)
    this.addMinimumZonesCallback2=this.addMinimumZonesCallback2.bind(this)
    this.addMaximumZonesCallback1=this.addMaximumZonesCallback1.bind(this)
    this.addMaximumZonesCallback2=this.addMaximumZonesCallback2.bind(this)
    this.addManualZoneCallback1=this.addManualZoneCallback1.bind(this)
    this.addManualZoneCallback2=this.addManualZoneCallback2.bind(this)
    this.getSelectedAreaMetaFromState=this.getSelectedAreaMetaFromState.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
    this.doSave=this.doSave.bind(this)
    this.setState=this.setState.bind(this)
  }

  buildToggleField(field_name, label) {
    let checked_val = ''
    if (this.state[field_name]) {
      checked_val = 'checked'
    }
    return (
      <div className='ml-2'>
        <div className='d-inline'>
          <input
            className='mr-2'
            checked={checked_val}
            type='checkbox'
            onChange={() => this.setLocalStateVar(field_name, !this.state[field_name])}
          />
        </div>
        <div className='d-inline'>
          {label}
        </div>
      </div>
    )
  }

  showSourceFrame(movie_url, image_frameset_index) {
    this.props.setCurrentVideo(movie_url)
    setTimeout((() => {this.props.setScrubberToIndex(image_frameset_index)}), 1000)
  }

  buildGotoSourceLink() {
    if (this.state.areas.length > 0) {
      const area = this.state.areas[0]
      if (Object.keys(this.props.movies).includes(area['movie'])) {
        const the_movie = this.props.movies[area['movie']]
        const the_frameset = this.props.getFramesetHashForImageUrl(
          area['image'], 
          the_movie['framesets']
        )
        const movie_framesets = this.props.getFramesetHashesInOrder(the_movie)
        const image_frameset_index = movie_framesets.indexOf(the_frameset)
        return (
          <div>
            <button
              className='bg-light border-0 text-primary'
              onClick={() => this.showSourceFrame(area['movie'], image_frameset_index)}
            >
              goto source frame
            </button>
          </div>
        )
      }
    }
  }

  addManualZoneCallback1(click_coords) {
    this.setState({
      first_click_coords: click_coords,
    })
    this.props.handleSetMode('selected_area_manual_zones_2')
  }

  addManualZoneCallback2(click_coords) {
    const zone_id = 'selected_area_manual_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_zone = {
      'start': this.state.first_click_coords,
      'end': click_coords,
    }
    let deepCopyManualZones = this.state['manual_zones']
    deepCopyManualZones[zone_id] = the_zone
    this.setLocalStateVar(
      'manual_zones', 
      deepCopyManualZones,
      (()=>{this.props.handleSetMode('selected_area_manual_zones_1')})
    )
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
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
    }
    let deepCopyMinimumZones = JSON.parse(JSON.stringify(this.state.minimum_zones))
    deepCopyMinimumZones.push(the_zone)
    this.setLocalStateVar('minimum_zones', deepCopyMinimumZones)
    this.props.handleSetMode('selected_area_minimum_zones_1')
  }

  addMaximumZonesCallback1(click_coords) {
    this.setState({
      first_click_coords: click_coords,
    })
    this.props.handleSetMode('selected_area_maximum_zones_2')
  }

  addMaximumZonesCallback2(click_coords) {
    const zone_id = 'selected_area_maximum_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_zone = {
        'id': zone_id,
        'start': this.state.first_click_coords,
        'end': click_coords,
    }
    let deepCopyMaximumZones = JSON.parse(JSON.stringify(this.state.maximum_zones))
    deepCopyMaximumZones.push(the_zone)
    this.setLocalStateVar('maximum_zones', deepCopyMaximumZones)
    this.props.handleSetMode('selected_area_maximum_zones_1')
  }

  addOriginLocation(origin_coords) {
    this.setLocalStateVar('origin_entity_location', origin_coords)
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

  getCurrentSelectedAreaMaximumZones() {
    return this.state.maximum_zones
  }

  getCurrentSelectedAreaManualZones() {
    if (Object.keys(this.state.manual_zones).includes('mask')) {
      let deepCopyManualZones = JSON.parse(JSON.stringify(this.state.manual_zones))
      delete deepCopyManualZones['mask']
      return deepCopyManualZones
    } else {
      return this.state.manual_zones
    }
  }

  componentDidMount() {
    this.props.addInsightsCallback('selected_area_area_coords_1', this.addAreaCoordsCallback)
    this.props.addInsightsCallback('selected_area_minimum_zones_1', this.addMinimumZonesCallback1)
    this.props.addInsightsCallback('selected_area_minimum_zones_2', this.addMinimumZonesCallback2)
    this.props.addInsightsCallback('selected_area_maximum_zones_1', this.addMaximumZonesCallback1)
    this.props.addInsightsCallback('selected_area_maximum_zones_2', this.addMaximumZonesCallback2)
    this.props.addInsightsCallback('getCurrentSelectedAreaCenters', this.getCurrentSelectedAreaCenters)
    this.props.addInsightsCallback('getCurrentSelectedAreaMinimumZones', this.getCurrentSelectedAreaMinimumZones)
    this.props.addInsightsCallback('getCurrentSelectedAreaMaximumZones', this.getCurrentSelectedAreaMaximumZones)
    this.props.addInsightsCallback('getCurrentSelectedAreaManualZones', this.getCurrentSelectedAreaManualZones)
    this.props.addInsightsCallback('getCurrentSelectedAreaOriginLocation', this.getCurrentSelectedAreaOriginLocation)
    this.props.addInsightsCallback('add_sa_origin_location_1', this.addOriginLocation)
    this.props.addInsightsCallback('selected_area_manual_zones_1', this.addManualZoneCallback1)
    this.props.addInsightsCallback('selected_area_manual_zones_2', this.addManualZoneCallback2)
    this.loadNewSelectedAreaMeta()
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
    this.setLocalStateVar('areas', deepCopyAreas)
    this.props.displayInsightsMessage('selected area center was added, add another if you wish')
  }
  
  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    let var_value_in_state = ''
    if (Object.keys(this.state).includes(var_name)) {
      var_value_in_state = this.state[var_name]
    }
    setLocalT1ScannerStateVar(var_name, var_value, var_value_in_state, this.doSave, this.setState, when_done)
  }

  buildLoadButton() {                                                           
    return buildTier1LoadButton(
      'selected_area',
      this.props.tier_1_scanners['selected_area'],
      ((value)=>{this.loadSelectedAreaMeta(value)})
    )
  }

  loadSelectedAreaMeta(selected_area_meta_id) {
    if (!selected_area_meta_id) {
      this.loadNewSelectedAreaMeta()
    } else {
      const sam = this.props.tier_1_scanners['selected_area'][selected_area_meta_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        select_type: sam['select_type'],
        merge: sam['merge'],
        masks_always: sam['masks_always'],
        interior_or_exterior: sam['interior_or_exterior'],
        attributes: sam['attributes'],
        origin_entity_type: sam['origin_entity_type'],
        origin_entity_id: sam['origin_entity_id'],
        origin_entity_location: sam['origin_entity_location'],
        scan_level: sam['scan_level'],
        areas: sam['areas'],
        minimum_zones : sam['minimum_zones'],
        maximum_zones : sam['maximum_zones'],
        manual_zones : sam['manual_zones'],
        tolerance: sam['tolerance'],
        everything_direction: sam['everything_direction'],
        respect_source_dimensions: sam['respect_source_dimensions'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['selected_area'] = selected_area_meta_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Selected area meta has been loaded')
  }

  loadNewSelectedAreaMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['selected_area'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'selected_area_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      select_type: 'flood',
      merge: true,
      masks_always: false,
      interior_or_exterior: 'interior',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_1',
      areas: [],
      minimum_zones: [],
      maximum_zones: [],
      manual_zones: {},
      tolerance: 5,
      everything_direction: '',
      respect_source_dimensions: true,
    })
  }

  getSelectedAreaMetaFromState() {
    const selected_area_meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      select_type: this.state.select_type,
      merge: this.state.merge,
      masks_always: this.state.masks_always,
      interior_or_exterior: this.state.interior_or_exterior,
      attributes: this.state.attributes,
      origin_entity_type: this.state.origin_entity_type,
      origin_entity_id: this.state.origin_entity_id,
      origin_entity_location: this.state.origin_entity_location,
      scan_level: this.state.scan_level,
      areas: this.state.areas,
      minimum_zones: this.state.minimum_zones,
      maximum_zones: this.state.maximum_zones,
      manual_zones: this.state.manual_zones,
      tolerance: this.state.tolerance,
      everything_direction: this.state.everything_direction,
      respect_source_dimensions: this.state.respect_source_dimensions,
    }
    return selected_area_meta
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'selected_area',
      this.getSelectedAreaMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((selected_area_meta) => {
      this.props.saveScannerToDatabase(
        'selected_area',
        selected_area_meta,
        (()=>{this.props.displayInsightsMessage('Selected Area has been saved to database')})
      )
    }))
  }

  isBasicSelectType() {
    if (
      this.state.select_type === 'invert' || 
      this.state.select_type === 'full_screen'
    ) {
      return true
    } 
    return false
  }

  buildSelectTypeDropdown() {
    const values = [
      {'flood': 'flood simple'},
      {'arrow': 'arrow simple'},
      {'manual': 'pick areas manually with mouse'},
      {'invert': 'invert whatever comes in'},
      {'full_screen': 'select the full screen'},
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

  buildEverythingField() {
    let none_checked = ''
    if (this.state.everything_direction === '') {
      none_checked = 'checked'
    }
    return (
      <div className='row mt-2'>
        <div className='col'>
          <div className='row'>
            <div className='col'>
              <input
                className='mr-2'
                type='radio'
                value='none'
                checked={none_checked}
                onChange={()=> this.setLocalStateVar('everything_direction', '')}
              />
              Don't go exclusively in any one direction
            </div>
          </div>
          <div className='row'>
            <div className='d-inline'>
              Go exclusively
            </div>
            <div className='d-inline ml-2'>
              <input
                className='mr-2'
                type='radio'
                value='north'
                checked={this.state.everything_direction === 'north'}
                onChange={()=> this.setLocalStateVar('everything_direction', 'north')}
              />
              North
            </div>

            <div className='d-inline ml-4'>
              <input
                className='mr-2'
                type='radio'
                value='south'
                checked={this.state.everything_direction === 'south'}
                onChange={()=> this.setLocalStateVar('everything_direction', 'south')}
              />
              South
            </div>

            <div className='d-inline ml-4'>
              <input
                className='mr-2'
                type='radio'
                value='east'
                checked={this.state.everything_direction === 'east'}
                onChange={()=> this.setLocalStateVar('everything_direction', 'east')}
              />
              East
            </div>

            <div className='d-inline ml-4'>
              <input
                className='mr-2'
                type='radio'
                value='west'
                checked={this.state.everything_direction === 'west'}
                onChange={()=> this.setLocalStateVar('everything_direction', 'west')}
              />
              West
            </div>

          </div>
        </div>
      </div>
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
    let adhoc_option = (<option value=''></option>)
    if (this.state.origin_entity_type === 'template_anchor') {
      for (let i=0; i < Object.keys(this.props.tier_1_scanners['template']).length; i++) {
        const template_id = Object.keys(this.props.tier_1_scanners['template'])[i]
        t1_temp_ids.push(template_id)
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
    this.setLocalStateVar('attributes', deepCopyAttributes)
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
    this.setLocalStateVar('attributes', deepCopyAttributes)
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

  startAddMaximumZones() {
    this.props.handleSetMode('selected_area_maximum_zones_1')
    this.props.displayInsightsMessage('specify the upper left corner of the maximum zone')
  }

  buildAddAreaCoordsButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Add Area Center',
      (()=>{this.startAddSelectedAreas()})
    )
  }

  buildAddMinimumZonesButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Add Min Zones',
      (()=>{this.startAddMinimumZones()})
    )
  }

  buildAddMaximumZonesButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Add Max Zones',
      (()=>{this.startAddMaximumZones()})
    )
  }

  buildSaveToDatabaseButton() {
    return buildInlinePrimaryButton(
      'Save to DB',
      (()=>{this.doSaveToDatabase()})
    )
  }

  buildRunButtonWrapper() {
    if (!Object.keys(this.props.tier_1_scanners['selected_area']).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 'selected_area', this.props.buildTier1RunOptions, this.props.submitInsightsJob
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'selected_area',
      this.props.tier_1_scanners['selected_area'],
      ((value)=>{this.deleteSelectedAreaMeta(value)})
    )
  }

  deleteSelectedAreaMeta(sam_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopySelectedAreas = deepCopyScanners['selected_area']
    delete deepCopySelectedAreas[sam_id]
    deepCopyScanners['selected_area'] = deepCopySelectedAreas
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (sam_id === this.props.current_ids['t1_scanner']['selected_area']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['selected_area'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Selected Area was deleted')
  }

  buildClearAreasButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Clear Area Centers',
      (()=>{this.clearAnchors()})
    )
  }
  
  buildClearMinimumZonesButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Clear Min Zones',
      (()=>{this.clearMinimumZones()})
    )
  }
  
  buildClearMaximumZonesButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Clear Max Zones',
      (()=>{this.clearMaximumZones()})
    )
  }
  
  buildAddManualZoneButton() {
    if (this.state.select_type !== 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Add Manual Zone',
      (()=>{this.startAddManualZone()})
    )
  }

  buildClearManualZonesButton() {
    if (this.state.select_type !== 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Clear Manual Zones',
      (()=>{this.clearManualZones()})
    )
  }
  
  startAddManualZone() {
    this.props.handleSetMode('selected_area_manual_zones_1')
    this.props.displayInsightsMessage('specify the upper left corner of the manual zone')
  }

  startAddOriginLocation() {
    this.props.handleSetMode('add_sa_origin_location_1')
  }

  buildAddOriginLocationButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Set Origin Location',
      (()=>{this.startAddOriginLocation()})
    )
  }

  buildClearOriginLocationButton() {
    if (this.state.select_type === 'manual') {
      return
    }
    return buildInlinePrimaryButton(
      'Clear Origin Location',
      (()=>{this.clearOriginLocation()})
    )
  }

  clearOriginLocation() {
    this.setLocalStateVar('origin_entity_location', [])
    this.props.displayInsightsMessage('Origin location has been cleared')
  }

  clearAnchors() {
    this.setLocalStateVar('areas', [])
    this.props.displayInsightsMessage('Area centers have been cleared')
  }

  clearMinimumZones() {
    this.setLocalStateVar('minimum_zones', [])
    this.props.displayInsightsMessage('Minimum zones have been cleared')
  }

  clearMaximumZones() {
    this.setLocalStateVar('maximum_zones', [])
    this.props.displayInsightsMessage('Maximum zones have been cleared')
  }

  clearManualZones() {
    this.setLocalStateVar('manual_zones', [])
    this.props.displayInsightsMessage('Manual zones have been cleared')
  }

  clearSelectedAreaMatches(scope) {
    return clearTier1Matches(
      'selected_area',
      this.props.tier_1_matches,
      this.props.current_ids['t1_scanner']['selected_area'],
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

  buildExclusiveFields() {
    let checked_value = ''
    if (this.state.respect_source_dimensions) {
      checked_value = 'checked'
    }
    return (
      <div>
        <div className='d-inline'>
          <input
            className='ml-2 mr-2 mt-1'
            checked={checked_value}
            type='checkbox'
            onChange={() => this.setLocalStateVar('respect_source_dimensions', !this.state.respect_source_dimensions)}
          />
        </div>
        <div className='d-inline'>
          Respect Source Dimensions
        </div>
      </div>
    )
  }

  buildNonExclusiveFields() {
    const merge_field = this.buildToggleField('merge', 'Merge Subareas')
    const masks_field = this.buildToggleField('masks_always', 'Generate Masks Always')
    const interior_or_exterior_dropdown = this.buildInteriorOrExteriorDropdown()
    const tolerance_field = this.buildToleranceField()
    if (this.state.everything_direction !== '') {
      return ''
    }
    return (
      <div>
        <div className='row mt-2'>
          {merge_field}
        </div>

        <div className='row mt-2'>
          {masks_field}
        </div>

        <div className='row mt-2'>
          {interior_or_exterior_dropdown}
        </div>

        <div className='row mt-2'>
          {tolerance_field}
        </div>

      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['selectedArea']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'selected area meta', false)
    const name_field = this.buildNameField()
    const attributes_list = this.buildAttributesList()
    const add_area_coords_button = this.buildAddAreaCoordsButton()
    const clear_area_coords_button = this.buildClearAreasButton()
    const add_minimum_zones_button = this.buildAddMinimumZonesButton()
    const clear_minimum_zones_button = this.buildClearMinimumZonesButton()
    const add_maximum_zones_button = this.buildAddMaximumZonesButton()
    const clear_maximum_zones_button = this.buildClearMaximumZonesButton()
    const add_origin_location_button = this.buildAddOriginLocationButton()
    const clear_origin_location_button = this.buildClearOriginLocationButton()
    const add_manual_button = this.buildAddManualZoneButton() 
    const clear_manual_button = this.buildClearManualZonesButton() 
    const select_type_dropdown = this.buildSelectTypeDropdown()
    const run_button = this.buildRunButtonWrapper()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const goto_source_link = this.buildGotoSourceLink()
    const header_row = makeHeaderRow(
      'selected area',
      'selected_area_body',
      (() => this.props.toggleShowVisibility('selectedArea'))
    )
    var exclusive_fields = this.buildExclusiveFields()
    var nonexclusive_fields = this.buildNonExclusiveFields()
    var everything_field = this.buildEverythingField()
    var origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    var origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    if (this.isBasicSelectType()) {
      nonexclusive_fields = ''
      exclusive_fields = ''
      everything_field = ''
      origin_entity_type_dropdown = ''
      origin_entity_id_dropdown = ''
    }

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
                  {add_maximum_zones_button}
                  {clear_maximum_zones_button}
                </div>

                <div className='row mt-2'>
                  {add_manual_button}
                  {clear_manual_button}
                </div>

                <div className='row mt-2'>
                  {id_string}
                </div>

                <div className='row mt-2'>
                  {goto_source_link}
                </div>

                <div className='row mt-2'>
                  {name_field}
                </div>

                <div className='row mt-2'>
                  {select_type_dropdown}
                </div>

                {everything_field}

                {nonexclusive_fields}

                {exclusive_fields}

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
                    search_attribute_name_id='selected_area_database_search_attribute_name'
                    search_attribute_value_id='selected_area_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='selected_area'
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

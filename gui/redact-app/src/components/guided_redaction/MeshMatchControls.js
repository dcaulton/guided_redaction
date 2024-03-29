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


class MeshMatchControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_1',
      maximum_zones: [],
      minimum_zones: [],
      masks_always: false,
      min_score: 15,
      mesh_size: 50,
      attribute_search_name: '',
      attribute_search_value: '',
      first_click_coords: [],
    }
    this.getCurrentMeshMatchMinimumZones=this.getCurrentMeshMatchMinimumZones.bind(this)
    this.getCurrentMeshMatchMaximumZones=this.getCurrentMeshMatchMaximumZones.bind(this)
    this.getCurrentMeshMatchOriginLocation=this.getCurrentMeshMatchOriginLocation.bind(this)
    this.addOriginLocation=this.addOriginLocation.bind(this)
    this.addMinimumZonesCallback1=this.addMinimumZonesCallback1.bind(this)
    this.addMinimumZonesCallback2=this.addMinimumZonesCallback2.bind(this)
    this.addMaximumZonesCallback1=this.addMaximumZonesCallback1.bind(this)
    this.addMaximumZonesCallback2=this.addMaximumZonesCallback2.bind(this)
    this.getMeshMatchMetaFromState=this.getMeshMatchMetaFromState.bind(this)
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
    if (this.state.minimum_zones.length > 0
        || this.state.maximum_zones.length > 0) {
      let mz = ''
      if (this.state.minimum_zones.length > 0) {
        mz = this.state.minimum_zones[0]
      } else {
        mz = this.state.maximum_zones[0]
      }
      if (Object.keys(this.props.movies).includes(mz['movie'])) {
        const the_movie = this.props.movies[mz['movie']]
        const the_frameset = this.props.getFramesetHashForImageUrl(
          mz['image'], 
          the_movie['framesets']
        )
        const movie_framesets = this.props.getFramesetHashesInOrder(the_movie)
        const image_frameset_index = movie_framesets.indexOf(the_frameset)
        return (
          <div>
            <button
              className='bg-light border-0 text-primary'
              onClick={() => this.showSourceFrame(mz['movie'], image_frameset_index)}
            >
              goto source frame
            </button>
          </div>
        )
      }
    }
  }

  addMinimumZonesCallback1(click_coords) {
    this.setState({
      first_click_coords: click_coords,
    })
    this.props.handleSetMode('mesh_match_minimum_zones_2')
  }

  addMinimumZonesCallback2(click_coords) {
    const zone_id = 'mesh_match_minimum_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
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
    this.props.handleSetMode('mesh_match_minimum_zones_1')
  }

  addMaximumZonesCallback1(click_coords) {
    this.setState({
      first_click_coords: click_coords,
    })
    this.props.handleSetMode('mesh_match_maximum_zones_2')
  }

  addMaximumZonesCallback2(click_coords) {
    const zone_id = 'mesh_match_maximum_zone_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const the_zone = {
        'id': zone_id,
        'start': this.state.first_click_coords,
        'end': click_coords,
        'image': this.props.insights_image,
        'movie': this.props.movie_url,
    }
    let deepCopyMaximumZones = JSON.parse(JSON.stringify(this.state.maximum_zones))
    deepCopyMaximumZones.push(the_zone)
    this.setLocalStateVar('maximum_zones', deepCopyMaximumZones)
    this.props.handleSetMode('mesh_match_maximum_zones_1')
  }

  addOriginLocation(origin_coords) {
    this.setLocalStateVar('origin_entity_location', origin_coords)
    this.props.displayInsightsMessage('mesh match origin location was added,')
    this.props.handleSetMode('')
  }

  getCurrentMeshMatchMinimumZones() {
    return this.state.minimum_zones
  }

  getCurrentMeshMatchMaximumZones() {
    return this.state.maximum_zones
  }

  getCurrentMeshMatchOriginLocation() {
    return this.state.origin_entity_location
  }

  componentDidMount() {
    this.props.addInsightsCallback('mesh_match_area_coords_1', this.addAreaCoordsCallback)
    this.props.addInsightsCallback('mesh_match_minimum_zones_1', this.addMinimumZonesCallback1)
    this.props.addInsightsCallback('mesh_match_minimum_zones_2', this.addMinimumZonesCallback2)
    this.props.addInsightsCallback('getCurrentMeshMatchMinimumZones', this.getCurrentMeshMatchMinimumZones)
    this.props.addInsightsCallback('mesh_match_maximum_zones_1', this.addMaximumZonesCallback1)
    this.props.addInsightsCallback('mesh_match_maximum_zones_2', this.addMaximumZonesCallback2)
    this.props.addInsightsCallback('getCurrentMeshMatchMaximumZones', this.getCurrentMeshMatchMaximumZones)
    this.props.addInsightsCallback('getCurrentMeshMatchOriginLocation', this.getCurrentMeshMatchOriginLocation)
    this.props.addInsightsCallback('add_mm_origin_location_1', this.addOriginLocation)
    this.loadNewMeshMatchMeta()
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
      'mesh_match',
      this.props.tier_1_scanners['mesh_match'],
      ((value)=>{this.loadMeshMatchMeta(value)})
    )
  }

  loadMeshMatchMeta(mesh_match_meta_id) {
    if (!mesh_match_meta_id) {
      this.loadNewMeshMatchMeta()
    } else {
      const sam = this.props.tier_1_scanners['mesh_match'][mesh_match_meta_id]
      this.setState({
        id: sam['id'],
        name: sam['name'],
        attributes: sam['attributes'],
        origin_entity_type: sam['origin_entity_type'],
        origin_entity_id: sam['origin_entity_id'],
        origin_entity_location: sam['origin_entity_location'],
        scan_level: sam['scan_level'],
        minimum_zones : sam['minimum_zones'],
        maximum_zones : sam['maximum_zones'],
        masks_always: sam['masks_always'],
        min_score: sam['min_score'],
        mesh_size: sam['mesh_size'],
      })
    }
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['mesh_match'] = mesh_match_meta_id
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    this.props.displayInsightsMessage('Mesh Match meta has been loaded')
  }

  loadNewMeshMatchMeta() {
    let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
    deepCopyIds['t1_scanner']['mesh_match'] = ''
    this.props.setGlobalStateVar('current_ids', deepCopyIds)
    const the_id = 'mesh_match_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()

    this.setState({
      id: the_id,
      name: '',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      origin_entity_location: [],
      scan_level: 'tier_1',
      minimum_zones: [],
      maximum_zones: [],
      masks_always: false,
      min_score: 15,
      mesh_size: 50,
    })
  }

  getMeshMatchMetaFromState() {
    const mesh_match_meta = {                                                          
      id: this.state.id,
      name: this.state.name,
      attributes: this.state.attributes,
      origin_entity_type: this.state.origin_entity_type,
      origin_entity_id: this.state.origin_entity_id,
      origin_entity_location: this.state.origin_entity_location,
      scan_level: this.state.scan_level,
      minimum_zones: this.state.minimum_zones,
      maximum_zones: this.state.maximum_zones,
      masks_always: this.state.masks_always,
      min_score: this.state.min_score,
      mesh_size: this.state.mesh_size,
    }
    return mesh_match_meta
  }

  doSave(when_done=(()=>{})) {
    doTier1Save(
      'mesh_match',
      this.getMeshMatchMetaFromState,
      this.props.displayInsightsMessage,
      this.props.tier_1_scanners,
      this.props.current_ids,
      this.props.setGlobalStateVar,
      when_done
    )
  }

  async doSaveToDatabase() {
    this.doSave(((mesh_match_meta) => {
      this.props.saveScannerToDatabase(
        'mesh_match',
        mesh_match_meta,
        (()=>{this.props.displayInsightsMessage('Mesh Match has been saved to database')})
      )
    }))
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'mesh_match_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildMinScoreField() {
    return buildLabelAndTextInput(
      this.state.min_score,
      'Min Score',
      'mesh_match_min_score',
      'min_score',
      4,
      ((value)=>{this.setLocalStateVar('min_score', value)})
    )
  }

  buildMeshSizeField() {
    return buildLabelAndTextInput(
      this.state.mesh_size,
      'Mesh Size',
      'mesh_match_mesh_size',
      'mesh_size',
      4,
      ((value)=>{this.setLocalStateVar('mesh_size', value)})
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
      'mesh_match_origin_entity_type',
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
              name='mesh_match_origin_entity_id'
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
    const value_ele = document.getElementById('mesh_match_attribute_value')
    const name_ele = document.getElementById('mesh_match_attribute_name')
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
      'mesh_match_attribute_name',
      'mesh_match_attribute_value',
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

  startAddMinimumZones() {
    this.props.handleSetMode('mesh_match_minimum_zones_1')
    this.props.displayInsightsMessage('specify the upper left corner of the minimum zone')
  }

  buildAddMinimumZonesButton() {
    return buildInlinePrimaryButton(
      'Add Min Zones',
      (()=>{this.startAddMinimumZones()})
    )
  }

  startAddMaximumZones() {
    this.props.handleSetMode('mesh_match_maximum_zones_1')
    this.props.displayInsightsMessage('specify the upper left corner of the maximum zone')
  }

  buildAddMaximumZonesButton() {
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
    if (!Object.keys(this.props.tier_1_scanners['mesh_match']).includes(this.state.id)) {
      return ''
    }
    return buildRunButton(
      this.props.tier_1_scanners, 
      'mesh_match', 
      this.props.buildTier1RunOptions, 
      this.props.submitInsightsJob,
      false
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton(
      'mesh_match',
      this.props.tier_1_scanners['mesh_match'],
      ((value)=>{this.deleteMeshMatchMeta(value)})
    )
  }

  deleteMeshMatchMeta(sam_id) {
    let deepCopyScanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
    let deepCopyMMs = deepCopyScanners['mesh_match']
    delete deepCopyMMs[sam_id]
    deepCopyScanners['mesh_match'] = deepCopyMMs
    this.props.setGlobalStateVar('tier_1_scanners', deepCopyScanners)
    if (sam_id === this.props.current_ids['t1_scanner']['mesh_match']) {
      let deepCopyIds = JSON.parse(JSON.stringify(this.props.current_ids))
      deepCopyIds['t1_scanner']['mesh_match'] = ''
      this.props.setGlobalStateVar('current_ids', deepCopyIds)
    }
    this.props.displayInsightsMessage('Mesh Match was deleted')
  }

  buildClearMinimumZonesButton() {
    return buildInlinePrimaryButton(
      'Clear Min Zones',
      (()=>{this.clearMinimumZones()})
    )
  }
  
  buildClearMaximumZonesButton() {
    return buildInlinePrimaryButton(
      'Clear Max Zones',
      (()=>{this.clearMaximumZones()})
    )
  }
  
  startAddOriginLocation() {
    this.props.handleSetMode('add_mm_origin_location_1')
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
    this.setLocalStateVar('origin_entity_location', [])
    this.props.displayInsightsMessage('Origin location has been cleared')
  }

  clearMinimumZones() {
    this.setLocalStateVar('minimum_zones', [])
    this.props.displayInsightsMessage('Minimum zones have been cleared')
  }

  clearMaximumZones() {
    this.setLocalStateVar('maximum_zones', [])
    this.props.displayInsightsMessage('Maximum zones have been cleared')
  }

  clearMeshMatchMatches(scope) {
    return clearTier1Matches(
      'mesh_match',
      this.props.tier_1_matches,
      this.props.current_ids['current_ids']['mesh_match'],
      this.props.movie_url,
      ((a,b)=>{this.props.setGlobalStateVar(a,b)}),
      ((a)=>{this.props.displayInsightsMessage(a)}),
      scope
    )
  }

  buildClearMatchesButton2() {
    return buildClearMatchesButton(
      'mesh_match',
      ((a)=>{this.clearMeshMatchMatches(a)})
    )
  }

  render() {
    if (!this.props.visibilityFlags['mesh_match']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = buildIdString(this.state.id, 'mesh match', false)
    const name_field = this.buildNameField()
    const min_score_field = this.buildMinScoreField()
    const masks_field = this.buildToggleField('masks_always', 'Generate Masks Always')
    const mesh_size_field = this.buildMeshSizeField()
    const attributes_list = this.buildAttributesList()
    const origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    const origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    const add_minimum_zones_button = this.buildAddMinimumZonesButton()
    const clear_minimum_zones_button = this.buildClearMinimumZonesButton()
    const add_maximum_zones_button = this.buildAddMaximumZonesButton()
    const clear_maximum_zones_button = this.buildClearMaximumZonesButton()
    const add_origin_location_button = this.buildAddOriginLocationButton()
    const clear_origin_location_button = this.buildClearOriginLocationButton()
    const run_button = this.buildRunButtonWrapper()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()
    const clear_matches_button = this.buildClearMatchesButton2()
    const goto_source_link = this.buildGotoSourceLink()
    const header_row = makeHeaderRow(
      'mesh match',
      'mesh_match_body',
      (() => this.props.toggleShowVisibility('mesh_match'))
    )

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='mesh_match_body' 
                className='row collapse bg-light'
            >
              <div id='mesh_match_main' className='col'>

                <div className='row'>
                  {load_button}
                  {delete_button}
                  {save_to_db_button}
                  {clear_matches_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {add_origin_location_button}
                  {clear_origin_location_button}
                  {add_minimum_zones_button}
                  {clear_minimum_zones_button}
                  {add_maximum_zones_button}
                  {clear_maximum_zones_button}
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
                  {masks_field}
                </div>

                <div className='row mt-2'>
                  {min_score_field}
                </div>

                <div className='row mt-2'>
                  {mesh_size_field}
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
                    search_attribute_name_id='mesh_match_database_search_attribute_name'
                    search_attribute_value_id='mesh_match_database_search_attribute_value'
                    getScanners={this.props.getScanners}
                    importScanner={this.props.importScanner}
                    deleteScanner={this.props.deleteScanner}
                    scanners={this.props.scanners}
                    displayInsightsMessage={this.props.displayInsightsMessage}
                    search_type='mesh_match'
                  />
                </div>

              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default MeshMatchControls;

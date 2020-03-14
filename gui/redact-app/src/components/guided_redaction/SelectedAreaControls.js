import React from 'react';
import ScannerSearchControls from './ScannerSearchControls'


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
      areas: [],
      unsaved_changes: false,
      attribute_search_name: '',
      attribute_search_value: '',
    }
    this.addAreaCoordsCallback=this.addAreaCoordsCallback.bind(this)
    this.getCurrentSelectedAreaCenters=this.getCurrentSelectedAreaCenters.bind(this)
  }

  getCurrentSelectedAreaCenters() {
    return this.state.areas
  }

  componentDidMount() {
    this.props.addInsightsCallback('selected_area_area_coords_1', this.addAreaCoordsCallback)
    this.props.addInsightsCallback('getCurrentSelectedAreaCenters', this.getCurrentSelectedAreaCenters)
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
    const selected_area_meta_keys= Object.keys(this.props.selected_area_metas)
    return (
      <div key='x34' className='d-inline'>
        <button
            key='temp_names_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='loadSelectedAreaDropdownButton'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Load
        </button>
        <div className='dropdown-menu' aria-labelledby='loadSelectedAreaDropdownButton'>
          {selected_area_meta_keys.map((value, index) => {
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.loadSelectedAreaMeta(value)}
              >
                {this.props.selected_area_metas[value]['name']}
              </button>
            )
          })}
          <button
              className='dropdown-item'
              key='000'
              onClick={() => this.loadNewSelectedAreaMeta()}
          >
            new
          </button>
        </div>
      </div>
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
        areas: sam['areas'],
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
      areas: [],
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
      areas: this.state.areas,
    }
    return selected_area_meta
  }

  doSave(when_done=(()=>{})) {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Save aborted: Name is required for a selected area meta')
      return
    }
    let sam_id = 'selected_area_meta_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    let selected_area_meta = this.getSelectedAreaMetaFromState()

    if (!selected_area_meta['id']) {
      selected_area_meta['id'] = sam_id
    }
    let deepCopySelectedAreaMetas= JSON.parse(JSON.stringify(this.props.selected_area_metas)) 
    deepCopySelectedAreaMetas[selected_area_meta['id']] = selected_area_meta
    this.props.setGlobalStateVar('selected_area_metas', deepCopySelectedAreaMetas)
    this.props.setGlobalStateVar('current_selected_area_meta_id', sam_id)
    this.setState({
      id: sam_id,
      unsaved_changes: false,
    })
    this.props.displayInsightsMessage('Selected Area Meta has been saved')              
    when_done(selected_area_meta)
  } 

  async doSaveToDatabase() {
    this.doSave(((selected_area_meta) => {
      if (selected_area_meta)
      this.props.saveScannerToDatabase(
        'selected_area_meta',
        selected_area_meta,
        (()=>{this.props.displayInsightsMessage('Selected Area Meta has been saved to database')})
      )
    }))
  }

  buildScaleDropdown() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Scale
        </div>
        <div className='d-inline ml-2'>
          <select
              name='selected_area_scale'
              value={this.state.scale}
              onChange={(event) => this.setLocalStateVar('scale', event.target.value)}
          >
            <option value='1:1'>actual image scale only</option>
            <option value='match_trigger'>match_trigger</option>
          </select>
        </div>
      </div>
    )
  }

  buildSelectTypeDropdown() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Select Type
        </div>
        <div className='d-inline ml-2'>
          <select
              name='selected_area_select_type'
              value={this.state.select_type}
              onChange={(event) => this.setLocalStateVar('select_type', event.target.value)}
          >
            <option value='flood'>flood simple</option>
            <option value='flood_true'>true flood</option>
            <option value='arrow'>arrow simple</option>
            <option value='arrow_chain'>arrow chain</option>
          </select>
        </div>
      </div>
    )
  }

  buildNameField() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Name:
        </div>
        <div
            className='d-inline ml-2'
        >
            <input
                id='selected_area_name'
                key='selected_area_name_1'
                title='name'
                size='25'
                value={this.state.name}
                onChange={(event) => this.setLocalStateVar('name', event.target.value)}
            />
        </div>
      </div>
    )
  }

  buildInteriorOrExteriorDropdown() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Interior or Exterior
        </div>
        <div className='d-inline ml-2'>
          <select
              name='selected_area_interior_or_exterior'
              value={this.state.interior_or_exterior}
              onChange={(event) => this.setLocalStateVar('interior_or_exterior', event.target.value)}
          >
            <option value='interior'>interior</option>
            <option value='exterior'>exterior</option>
          </select>
        </div>
      </div>
    )
  }

  buildOriginEntityTypeDropdown() {
    return (
      <div>
        <div className='d-inline ml-2'>
          Origin Entity Type
        </div>
        <div className='d-inline ml-2'>
          <select
              name='selected_area_origin_entity_type'
              value={this.state.origin_entity_type}
              onChange={(event) => this.setLocalStateVar('origin_entity_type', event.target.value)}
          >
            <option value='adhoc'>ad hoc</option>
            <option value='template_anchor'>template</option>
          </select>
        </div>
      </div>
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
              value={this.state.origin_entity_type}
              onChange={(event) => this.setLocalStateVar('origin_entity_id', event.target.value)}
          >
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
    return (
        <div>
        <div className='font-weight-bold'>
          Attributes
        </div>
        <div>
          <div className='d-inline ml-2'>
            Name:
          </div>
          <div className='d-inline ml-2'>
            <input
                id='selected_area_attribute_name'
                key='selected_area_attribute_name_1'
                title='attribute name'
                size='25'
            />
          </div>
          <div className='d-inline ml-2'>
            Value:
          </div>
          <div className='d-inline ml-2'>
            <input
                id='selected_area_attribute_value'
                key='selected_area_attribute_value_1'
                title='attribute value'
                size='25'
            />
          </div>
          <div className='d-inline ml-2'>
            <button
                className='btn btn-primary p-1'
                key={889922}
                onClick={() => this.doAddAttribute()}
            >
              Add
            </button>
          </div>
        </div>
        <div>
          {Object.keys(this.state.attributes).map((name, index) => {
            return (
              <div key={index} className='mt-2'>
                <div className='d-inline'>
                  Name:
                </div>
                <div className='d-inline ml-2'>
                  {name}
                </div>
                <div className='d-inline ml-4'>
                  Value:
                </div>
                <div className='d-inline'>
                  {this.state.attributes[name]}
                </div>
                <div className='d-inline ml-2'>
                  <button
                      className='btn btn-primary'
                      key={index}
                      onClick={() => this.deleteAttribute(name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  startAddSelectedAreas() {
    this.props.handleSetMode('selected_area_area_coords_1')
    this.props.displayInsightsMessage('specify the center of the selected area')
  }

  buildAddAreaCoordsButton() {
    return (
      <div className='d-inline ml-2'>
        <button
            className='btn btn-primary'
            key={884122}
            onClick={() => this.startAddSelectedAreas()}
        >
          Add Area Center
        </button>
      </div>
    )
  }

  buildSaveButton() {
    return (
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2'
            onClick={() => this.doSave()}
        >
          Save
        </button>
      </div>
    )
  }

  buildSaveToDatabaseButton() {
    return (
      <div
          className='d-inline'
      >
        <button
            className='btn btn-primary ml-2'
            onClick={() => this.doSaveToDatabase()}
        >
          Save to DB
        </button>
      </div>
    )
  }
  buildTier1TemplateRunOptions() {
    if (this.state.scan_level === 'tier_1') {
      return ''
    }
    const tier_1_match_keys = Object.keys(this.props.tier_1_matches['template'])
    if (tier_1_match_keys.length === 0) {
      return ''
    }

    return (
      <div>
        {tier_1_match_keys.map((value, index) => {
          let detail_line = 'Frames matched by template id ' + value
          if (Object.keys(this.props.templates).includes(value)) {
            detail_line = 'Frames matched by template ' + this.props.templates[value]['name']
          }
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.props.submitInsightsJob('current_selected_area_meta_tier1_template', value)}
            >
              {detail_line}
            </button>
          )
        })}
      </div>
    )
  }

  buildTier1OcrRunOptions() {
    if (this.state.scan_level === 'tier_1') {
      return ''
    }
    const tier_1_match_keys = Object.keys(this.props.tier_1_matches['ocr'])
    if (tier_1_match_keys.length === 0) {
      return ''
    }
    
    return (
      <div>
        {tier_1_match_keys.map((value, index) => {
          let detail_line = 'Frames matched by ocr rule ' + value
          if (value === this.props.current_ocr_rule_id) {
            detail_line = 'Frames matched by current active ocr rule'
          }
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.props.submitInsightsJob('current_selected_area_meta_tier1_ocr', value)}
            >
              {detail_line}
            </button>
          )
        })}
      </div>
    )
  }

  buildRunButton() {
    if (!this.state.id) {
      return ''
    }
    let movie_set_keys = Object.keys(this.props.movie_sets)
    const tier_1_template_options = this.buildTier1TemplateRunOptions()
    const tier_1_ocr_options = this.buildTier1OcrRunOptions()
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
            {movie_set_keys.map((value, index) => {
              return (
                <button
                    className='dropdown-item'
                    key={index}
                    onClick={() => this.props.submitInsightsJob('current_selected_area_meta_movie_set', value)}
                >
                  MovieSet '{this.props.movie_sets[value]['name']}' as Job
                </button>
              )
            })}
          {tier_1_template_options}
          {tier_1_ocr_options}
        </div>
      </div>
    )
  }

  buildDeleteButton() {
    let return_array = []
    const sam_keys = Object.keys(this.props.selected_area_metas)
    return_array.push(
      <div key='ls225' className='d-inline'>
      <button
          key='temp_delete_button'
          className='btn btn-primary ml-2 dropdown-toggle'
          type='button'
          id='deleteSelectedAreaDropdownButton'
          data-toggle='dropdown'
          area-haspopup='true'
          area-expanded='false'
      >
        Delete
      </button>
      <div className='dropdown-menu' aria-labelledby='deleteSelectedAreaDropdownButton'>
        {sam_keys.map((value, index) => {
          return (
            <button
                className='dropdown-item'
                key={index}
                onClick={() => this.deleteSelectedAreaMeta(value)}
            >
              {this.props.selected_area_metas[value]['name']}
            </button>
          )
        })}
      </div>
      </div>
    )
    return return_array
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

  addTemplateAnchor() {
    this.setState({
      unsaved_changes: true,
    })
    this.props.handleSetMode('add_template_anchor_1')
  }

  buildClearAreasButton() {
    return (
      <button
          className='btn btn-primary ml-2'
          onClick={() => this.clearAreas()}
      >
        Clear Area Centers
      </button>
    )
  }

  clearAnchors() {
    this.setState({
      areas: [],
      unsaved_changes: true,
    })
    this.props.displayInsightsMessage('Area centers have been cleared')
  }

  buildIdString() {
    if (!this.state.id) {
      return (
        <div className='d-inline ml-2 font-weight-bold text-danger font-italic h5'>
          this selected area meta has not been saved and has no id yet
        </div>
      )
    }
    let unsaved_changes_string = ''
    if (this.state.unsaved_changes) {
      unsaved_changes_string = (
        <div className='font-weight-bold text-danger ml-2 h5'>
         there are unsaved changes - don't forget to press save
        </div>
      )
    }
    return (
      <div>
        <div className='d-inline ml-2'>
          Selected Area Meta id: {this.state.id}
        </div>
        <div className='d-inline ml-2 font-italic'>
          {unsaved_changes_string}
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['selectedArea']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const id_string = this.buildIdString()
    const name_field = this.buildNameField()
    const scale_dropdown = this.buildScaleDropdown()
    const select_type_dropdown = this.buildSelectTypeDropdown()
    const interior_or_exterior_dropdown = this.buildInteriorOrExteriorDropdown()
    const attributes_list = this.buildAttributesList()
    const origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    const origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    const add_area_coords_button = this.buildAddAreaCoordsButton()
    const clear_area_coords_button = this.buildClearAreasButton()
    const save_button = this.buildSaveButton()
    const run_button = this.buildRunButton()
    const delete_button = this.buildDeleteButton()
    const save_to_db_button = this.buildSaveToDatabaseButton()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>
            <div className='row'>
              <div 
                className='col-lg-10 h3'
              > 
                selected area
              </div>
              <div className='col-lg-1 float-right'>
                <button
                    className='btn btn-link'
                    aria-expanded='false'
                    data-target='#selected_area_body'
                    aria-controls='selected_area_body'
                    data-toggle='collapse'
                    type='button'
                >
                  +/-
                </button>
              </div>
              <div className='col-lg-1'>
                <div>
                  <input
                    className='mr-2 mt-3'
                    type='checkbox'
                    onChange={() => this.props.toggleShowVisibility('selectedArea')}
                  />
                </div>
              </div>

            </div>

            <div 
                id='selected_area_body' 
                className='row collapse bg-light'
            >
              <div id='selected_area_main' className='col'>

                <div className='row'>
                  {load_button}
                  {add_area_coords_button}
                  {clear_area_coords_button}
                  {run_button}
                </div>

                <div className='row mt-2'>
                  {delete_button}
                  {save_button}
                  {save_to_db_button}
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

import React from 'react';

class SelectedAreaControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      select_type: 'arrow`',
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
    this.props.setGlobalStateVar('selected_area_meta_id', selected_area_meta_id)
    this.props.displayInsightsMessage('Selected area meta has been loaded')
  }

  loadNewSelectedAreaMeta() {
    this.props.setGlobalStateVar('current_selected_area_meta_id', '')
    this.setState({
      id: '',
      name: '',
      select_type: 'arrow`',
      scale: '1:1',
      interior_or_exterior: 'interior',
      attributes: {},
      origin_entity_type: 'adhoc',
      origin_entity_id: '',
      areas: [],
      unsaved_changes: false,
    })
  }

  async doSave() {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Save aborted: Name is required for a selected area meta')
      return
    }
    let sam_id = 'selected_area_meta_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    if (this.state.id) {
      sam_id = this.state.id
    }
    let selected_area_meta = {                                                          
      id: sam_id,
      name: this.state.name,
      select_type: this.state.select_type,
      scale: this.state.scale,
      interior_or_exterior: this.state.interior_or_exterior,
      attributes: this.state.attributes,
      origin_entity_type: this.state.origin_entity_type,
      origin_entity_id: this.state.origin_entity_id,
      areas: this.state.areas,
    }
    let deepCopySelectedAreaMetas= JSON.parse(JSON.stringify(this.props.selected_area_metas)) 
    deepCopySelectedAreaMetas[sam_id] = selected_area_meta
    this.props.setGlobalStateVar('selected_area_metas', deepCopySelectedAreaMetas)
    this.props.setGlobalStateVar('current_selected_area_meta_id', sam_id)
    this.setState({
      id: sam_id,
      unsaved_changes: false,
    })
    this.props.displayInsightsMessage('Selected Area Meta has been saved')              
    return selected_area_meta
  } 

  async doSaveToDatabase() {
    this.doSave()
//    this.props.saveCurrentSelectedAreaMetaToDatabase()
    this.props.displayInsightsMessage('Selected Area Meta has been saved to database')
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
            <option value='flood_simple'>flood simple</option>
            <option value='flood'>true flood</option>
            <option value='arrow_simple'>arrow simple</option>
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
            <option value='template'>template</option>
            <option value='ocr'>ocr</option>
            <option value='telemetry'>telemetry</option>
          </select>
        </div>
      </div>
    )
  }

  buildOriginEntityIdDropdown() {
    let t1_temp_ids = []
    let t2_temp_ids = []
    let t1_ocr_ids = []
    let t1_tel_ids = []
    let adhoc_option = (<option value='adhoc'>ad hoc</option>)
    if (this.state.origin_entity_type === 'template') {
      t1_temp_ids = Object.keys(this.props.tier_1_matches['template'])
      t2_temp_ids = Object.keys(this.props.templates)
      adhoc_option = ''
    }
    if (this.state.origin_entity_type === 'ocr') {
      t1_ocr_ids = Object.keys(this.props.tier_1_matches['ocr'])
      adhoc_option = ''
    }
    if (this.state.origin_entity_type === 'telemetry') {
      t1_tel_ids = Object.keys(this.props.tier_1_matches['telemetry'])
      adhoc_option = ''
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
            {t1_temp_ids.map((value, index) => {
              const the_key = 'sa_origin_entity_template_' + index.toString()
              return (
                <option value={value} key={the_key}>tier 1 template: {value}</option>
              )
            })}
            {t2_temp_ids.map((value, index) => {
              const the_key = 'sa_origin_entity_t2_template_' + index.toString()
              return (
                <option value={value} key={the_key}>tier 2 template: {value}</option>
              )
            })}
            {t1_ocr_ids.map((value, index) => {
              const the_key = 'sa_origin_entity_ocr_' + index.toString()
              return (
                <option value={value} key={the_key}>tier 1 ocr: {value}</option>
              )
            })}
            {t1_tel_ids.map((value, index) => {
              const the_key = 'sa_origin_entity_telemetry_' + index.toString()
              return (
                <option value={value} key={the_key}>tier 1 telemetry: {value}</option>
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




  render() {
    if (!this.props.visibilityFlags['selectedArea']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const name_field = this.buildNameField()
    const scale_dropdown = this.buildScaleDropdown()
    const select_type_dropdown = this.buildSelectTypeDropdown()
    const interior_or_exterior_dropdown = this.buildInteriorOrExteriorDropdown()
    const attributes_list = this.buildAttributesList()
    const origin_entity_type_dropdown = this.buildOriginEntityTypeDropdown()
    const origin_entity_id_dropdown = this.buildOriginEntityIdDropdown()
    const add_area_coords_button = this.buildAddAreaCoordsButton()
    const save_button = this.buildSaveButton()

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
                  {save_button}
                  {add_area_coords_button}
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


              </div>
            </div>
          </div>
        </div>
    )
  }
}

export default SelectedAreaControls;

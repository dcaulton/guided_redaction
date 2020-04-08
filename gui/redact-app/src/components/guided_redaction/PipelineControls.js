import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  buildLabelAndTextInput,
  buildAttributesAsRows,
  buildAttributesAddRow,
  buildTier1DeleteButton,
  buildTier1LoadButton,
  buildIdString,
} from './SharedControls'

class PipelineControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      description: '',
      attributes: {},
      edges: {},
      node_metadata: {
        'node': {},
        'template': {},
        'selected_area': {},
        'ocr': {},
        'telemetry': {},
        'redact': {},
        'split_and_hash': {},
        'zip': {},
      },
      movie_urls: [],
      attribute_search_value: '',
      use_parsed_movies: false,
      unsaved_changes: false,
    }
    this.afterPipelineSaved=this.afterPipelineSaved.bind(this)
    this.deletePipeline=this.deletePipeline.bind(this)
    this.addNode=this.addNode.bind(this)
    this.updateNodeValue=this.updateNodeValue.bind(this)
    this.loadPipeline=this.loadPipeline.bind(this)
    this.loadNewPipeline=this.loadNewPipeline.bind(this)
    this.addNodeEdge=this.addNodeEdge.bind(this)
    this.deleteNodeEdge=this.deleteNodeEdge.bind(this)
  }

  addNode() {
    const node_id = 'node_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const new_node = {
      id: node_id,
      name: '',
      type: '',
      scope: '',
      entity_id: '',
    }
    let deepCopyNodeMetadata = JSON.parse(JSON.stringify(this.state.node_metadata))
    deepCopyNodeMetadata['node'][node_id] = new_node
    this.setLocalStateVar(
      'node_metadata', 
      deepCopyNodeMetadata,
      (()=>{this.props.displayInsightsMessage('node was added')})
    )
  }

  deleteNodeEdge(originating_node_id, target_node_id) {
    let deepCopyEdges = JSON.parse(JSON.stringify(this.state.edges))
    let new_node_edges = []
    for (let i=0; i < this.state.edges[originating_node_id].length; i++) {
      const tt = this.state.edges[originating_node_id][i]
      if (tt !== target_node_id) {
        new_node_edges.push(tt)
      }
    }
    deepCopyEdges[originating_node_id] = new_node_edges
    this.setLocalStateVar(
      'edges', 
      deepCopyEdges,
      (()=>{this.props.displayInsightsMessage('edge was removed')})
    )
  }

  addNodeEdge(originating_node_id, target_node_id) {
    let deepCopyEdges = JSON.parse(JSON.stringify(this.state.edges))
    if (!Object.keys(deepCopyEdges).includes(originating_node_id)) {
      deepCopyEdges[originating_node_id] = []
    }
    deepCopyEdges[originating_node_id].push(target_node_id)
    this.setLocalStateVar(
      'edges', 
      deepCopyEdges,
      (()=>{this.props.displayInsightsMessage('edge was added')})
    )
  }

  handleAddEntityId(deepCopyNodeMetadata, node_id, value) {
    const node = deepCopyNodeMetadata['node'][node_id]
    if (node['type'] === 'template') {
      deepCopyNodeMetadata['template'][value] = this.props.templates[value]
    } else if (node['type'] === 'selected_area') {
      deepCopyNodeMetadata['selected_area'][value] = this.props.selected_area_metas[value]
    } else if (node['type'] === 'ocr') {
      deepCopyNodeMetadata['ocr'][value] = this.props.ocr_rules[value]
    } else if (node['type'] === 'telemetry') {
      deepCopyNodeMetadata['telemetry'][value] = this.props.telemetry_rules[value]
    }
  }

  updateNodeValue(node_id, field_name, value) {
    let deepCopyNodeMetadata = JSON.parse(JSON.stringify(this.state.node_metadata))
    deepCopyNodeMetadata['node'][node_id][field_name] = value
    if (field_name === 'entity_id') {
      this.handleAddEntityId(deepCopyNodeMetadata, node_id, value)
    } 
    this.setState({'node_metadata': deepCopyNodeMetadata})
  }

  componentDidMount() {
    this.props.getPipelines()
  }

  getPipelineFromState() {
    let build_movies = {}
    for (let i=0; i < this.state.movie_urls.length; i++) {
      const movie_url = this.state.movie_urls[i]
      if (Object.keys(this.props.movies).includes(movie_url) && this.state.use_parsed_movies) {
        build_movies[movie_url] = this.props.movies[movie_url]
      } else {
        build_movies[movie_url] = {}
      }
    }

    const pipeline = {
      id: this.state.id,
      name: this.state.name,
      description: this.state.description,
      attributes: this.state.attributes,
      edges: this.state.edges,
      node_metadata: this.state.node_metadata,
      movies: build_movies,
    }
    return pipeline
  }

  afterPipelineSaved(pipeline_response_obj) {
    if (Object.keys(pipeline_response_obj).includes('pipeline_id')) {
      const pipeline_id = pipeline_response_obj['pipeline_id']
      this.setState({
        id: pipeline_id,
        unsaved_changes: false,
      })
      this.props.displayInsightsMessage('pipeline was successfully saved')
    }
  }

  doSave() {
    if (!this.state.name) {
      this.props.displayInsightsMessage('Cannot save a pipeline without a name')
      return
    }
    const pipeline_obj = this.getPipelineFromState()
    this.props.savePipelineToDatabase(
      pipeline_obj,
      this.afterPipelineSaved
    )
  }

  doRun(scope) {
    this.props.dispatchPipeline(this.props.current_pipeline_id, scope)
    this.props.displayInsightsMessage('pipeline was dispatched')
  }

  deletePipeline(pipeline_id) {
    this.props.deletePipeline(
      pipeline_id,
      this.props.displayInsightsMessage('pipeline was deleted')
    )
  }

  loadNewPipeline() {
    this.props.setGlobalStateVar('current_pipeline_id', '')
    this.setState({
      id: '',
      name: '',
      description: '',
      attributes: {},
      steps: [],
      movie_urls: [],
      unsaved_changes: false,
    })
  }

  loadPipeline(pipeline_id) {
    if (!pipeline_id) {
      this.loadNewPipeline()
    } else {
      const pipeline = this.props.pipelines[pipeline_id]
      if (!pipeline) {
        return
      }
      const content = JSON.parse(pipeline['content'])
      let movie_urls = []
      for (let i=0; i < Object.keys(content['movies']).length; i++) {
        movie_urls.push(Object.keys(content['movies'])[i])
      }
      this.setState({
        id: pipeline_id,
        name: content['name'],
        description: content['description'],
        attributes: pipeline['attributes'],
        movie_urls: movie_urls,
        edges: content['edges'],
        node_metadata: content['node_metadata'],
        unsaved_changes: false,
      })
    }
    this.props.setGlobalStateVar('current_pipeline_id', pipeline_id)
    this.props.displayInsightsMessage('pipeline has been loaded')
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
      'pipeline', 
      this.props.pipelines, 
      ((id)=>{this.loadPipeline(id)})
    )
  }

  buildAddStepButton() {
    return buildInlinePrimaryButton(
      'Add Step',
      (()=>{this.addNode()})
    )
  }

  buildDeleteButton() {
    return buildTier1DeleteButton('pipeline', this.props.pipelines, this.deletePipeline)
  }

  buildSaveButton() {
    return buildInlinePrimaryButton(
      'Save',
      (()=>{this.doSave()})
    )
  }

  buildRunButton() {
    if (!this.state.id) {
      return ''
    }
    return (
      <div className='d-inline'>
        <button
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='run_pipeline_button'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Run
        </button>
        <div
            className='dropdown-menu'
            aria-labelledby='run_pipeline_button'
        >
          <button
              className='dropdown-item'
              onClick={() => this.doRun('current_movie')}
          >
            Selected Movie
          </button>
          <button
              className='dropdown-item'
              onClick={() => this.doRun('all_movies')}
          >
            All Movies
          </button>
        </div>
      </div>
    )
  }

  buildNameField() {
    return buildLabelAndTextInput(
      this.state.name,
      'Name',
      'pipeline_name',
      'name',
      25,
      ((value)=>{this.setLocalStateVar('name', value)})
    )
  }

  buildDescriptionField() {
    return buildLabelAndTextInput(
      this.state.description,
      'Description',
      'pipeline_description',
      'description',
      80,
      ((value)=>{this.setLocalStateVar('description', value)})
    )
  }

  buildUseParsedMoviesCheckbox() {
    let use_parsed_movies_checked = ''
    if (this.state.use_parsed_movies) {
      use_parsed_movies_checked = 'checked'
    }
    return (
      <div>
        <input
          className='ml-2 mr-2 mt-1'
          id='toggle_show_brief'
          checked={use_parsed_movies_checked}
          type='checkbox'
          onChange={() => this.toggleUseParsedMovies()}
        />
        Use Parsed Movies
      </div>
    )
  }

  toggleUseParsedMovies() {
    const new_value = (!this.state.use_parsed_movies)
    this.setState({
      use_parsed_movies: new_value,
    })
  }

  buildAttributesList() {
    const add_attr_row = buildAttributesAddRow(
      'pipeline_attribute_name',
      'pipeline_attribute_value',
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

  doAddAttribute() {
    const value_ele = document.getElementById('pipeline_attribute_value')
    const name_ele = document.getElementById('pipeline_attribute_name')
    if (value_ele.value && name_ele.value) {
      this.setAttribute(name_ele.value, value_ele.value)
      name_ele.value = ''
      value_ele.value = ''
    }
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

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 'pipeline', this.state.unsaved_changes)
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const name_field = this.buildNameField()
    const description_field = this.buildDescriptionField()
    const attributes_list = this.buildAttributesList()
    const use_parsed_movies_checkbox = this.buildUseParsedMoviesCheckbox()
    const header_row = makeHeaderRow(
      'pipelines',
      'pipelines_body',
    )
    const sequence_header_row = ''

    return (
      <div className='row bg-light rounded mt-3'>
        <div className='col'>

          {header_row}

          <div 
              id='pipelines_body' 
              className='row collapse'
          >
            <div id='pipelines_main' className='col'>

              <div className='row'>
                {load_button}
                {save_button}
                {delete_button}
                {run_button}
              </div>

              <div className='row mt-2'>
                {id_string}
              </div>

              <div className='row mt-2'>
                {name_field}
              </div>

              <div className='row mt-2'>
                {description_field}
              </div>

              <div className='row mt-2'>
                {use_parsed_movies_checkbox}
              </div>

              <div className='row mt-2'>
                {attributes_list}
              </div>

              <div className='row'>
                <div className='col'>
                  {sequence_header_row}
                  <div id='pipelines_sequence_body' className='row '>

                    <NodeCardList
                      node_metadata={this.state.node_metadata}
                      edges={this.state.edges}
                      addNode={this.addNode}
                      addNodeEdge={this.addNodeEdge}
                      deleteNodeEdge={this.deleteNodeEdge}
                      updateNodeValue={this.updateNodeValue}
                      templates={this.props.templates}
                      selected_area_metas={this.props.selected_area_metas}
                      ocr_rules={this.props.ocr_rules}
                      telemetry_rules={this.props.telemetry_rules}
                    />
                  
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    )
  }
}

class NodeCardList extends React.Component {
  buildAddStepButton() {
    return (
      <button
          className='btn btn-primary p-1'
          onClick={() => this.props.addNode()}
      >
        Add Step
      </button>
    )
  }
  
  render() {
    const add_button = this.buildAddStepButton() 
    return (
      <div className='col'>
        <div className='row'>
          <div className='col-lg-3'>
            {add_button}
          </div>
          <div className='col-lg-6'>
            {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
              return (
                <NodeCard
                  key={index}
                  node_id={node_id}
                  node_metadata={this.props.node_metadata}
                  edges={this.props.edges}
                  updateNodeValue={this.props.updateNodeValue}
                  addNodeEdge={this.props.addNodeEdge}
                  deleteNodeEdge={this.props.deleteNodeEdge}
                  templates={this.props.templates}
                  selected_area_metas={this.props.selected_area_metas}
                  ocr_rules={this.props.ocr_rules}
                  telemetry_rules={this.props.telemetry_rules}
                />
              )
            })}
          </div>
          <div className='col-lg-3'>
          right
          </div>
        </div>
      </div>
    )
  }
}

class NodeCard extends React.Component {
  buildNameField() {
    if (!this.props.node_metadata['node']) {
      return ''
    }
    return (
      <div>
        <div className='d-inline'>
          Name
        </div>
        <div
            className='d-inline ml-2'
        >
          <input
              size='25'
              value={this.props.node_metadata['node'][this.props.node_id]['name']}
              onChange={
                (event) => this.props.updateNodeValue(this.props.node_id, 'name', event.target.value)
              }
          />
        </div>
      </div>
    )
  }

  getSelectForEntityId() {
    let options = []
    options.push(<option value='' key='9999sw'></option>)
    if (this.props.node_metadata['node'][this.props.node_id]['type'] === 'template') {
      for (let i=0; i < Object.keys(this.props.templates).length; i++) {
        const scanner_id = Object.keys(this.props.templates)[i]
        const scanner= this.props.templates[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
      for (let i=0; i < Object.keys(this.props.node_metadata['template']).length; i++) {
        const scanner_id = Object.keys(this.props.node_metadata['template'])[i]
        const scanner= this.props.node_metadata['template'][scanner_id]
        options.push(
          <option value={scanner_id} key={scanner_id}>{scanner['name']}</option>
        )
      }
    } else if (this.props.node_metadata['node'][this.props.node_id]['type'] === 'selected_area') {
      for (let i=0; i < Object.keys(this.props.selected_area_metas).length; i++) {
        const scanner_id = Object.keys(this.props.selected_area_metas)[i]
        const scanner= this.props.selected_area_metas[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
      for (let i=0; i < Object.keys(this.props.node_metadata['selected_area']).length; i++) {
        const scanner_id = Object.keys(this.props.node_metadata['selected_area'])[i]
        const scanner= this.props.node_metadata['selected_area'][scanner_id]
        options.push(
          <option value={scanner_id} key={scanner_id}>{scanner['name']}</option>
        )
      }
    } else if (this.props.node_Metadata['node'][this.props.node_id]['type'] === 'ocr') {
      for (let i=0; i < Object.keys(this.props.ocr_rules).length; i++) {
        const scanner_id = Object.keys(this.props.ocr_rules)[i]
        const scanner= this.props.ocr_rules[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
      for (let i=0; i < Object.keys(this.props.node_metadata['ocr']).length; i++) {
        const scanner_id = Object.keys(this.props.node_metadata['ocr'])[i]
        const scanner= this.props.node_metadata['ocr'][scanner_id]
        options.push(
          <option value={scanner_id} key={scanner_id}>{scanner['name']}</option>
        )
      }
    } else if (this.props.node_metadata['node'][this.props.node_id]['type'] === 'telemetry') {
      for (let i=0; i < Object.keys(this.props.telemetry_rules).length; i++) {
        const scanner_id = Object.keys(this.props.telemetry_rules)[i]
        const scanner= this.props.telemetry_rules[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
      for (let i=0; i < Object.keys(this.props.node_metadata['telemetry']).length; i++) {
        const scanner_id = Object.keys(this.props.node_metadata['telemetry'])[i]
        const scanner= this.props.node_metadata['telemetry'][scanner_id]
        options.push(
          <option value={scanner_id} key={scanner_id}>{scanner['name']}</option>
        )
      }
    }
    return (
      <select
          name='step_type'
          value={this.props.node_metadata['node'][this.props.node_id]['entity_id']}
          onChange={
            (event) => this.props.updateNodeValue(this.props.node_id, 'entity_id', event.target.value)
          }
      >
        {options}
      </select>
    )
  }

  buildEntityIdField() {
    if (!this.props.node_metadata['node']) {
      return ''
    }
    const id_types = ['template', 'selected_area', 'ocr', 'telemetry']
    if (!id_types.includes(this.props.node_metadata['node'][this.props.node_id]['type'])) {
      return ''
    }
    const select = this.getSelectForEntityId()
    return (
      <div>
        <div className='d-inline'>
          Entity Id
        </div>
        <div className='d-inline ml-2'>
          {select}
        </div>
      </div>
    )
  }

  buildTypeField() {
    if (!this.props.node_metadata['node']) {
      return ''
    }
    return (
      <div>
        <div className='d-inline'>
          Type
        </div>
        <div className='d-inline ml-2'>
          <select
              name='step_type'
              value={this.props.node_metadata['node'][this.props.node_id]['type']}
              onChange={
                (event) => this.props.updateNodeValue(this.props.node_id, 'type', event.target.value)
              }
          >
            <option value=''></option>
            <option value='split_and_hash'>split and hash</option>
            <option value='template'>template</option>
            <option value='selected_area'>selected area</option>
            <option value='ocr'>ocr</option>
            <option value='telemetry'>telemetry</option>
            <option value='t1_sum'>sum t1 outputs</option>
            <option value='redact'>redact</option>
            <option value='zip'>zip</option>
          </select>
        </div>
      </div>
    )
  }

  buildEdgeDropdownId() {
    return this.props.node_id +  '_edge_dropdown'
  }

  doAddNodeEdge() {
    const edge_dropdown_field_id = this.buildEdgeDropdownId()
    const edge_dropdown_id = document.getElementById(edge_dropdown_field_id).value
    this.props.addNodeEdge(this.props.node_id, edge_dropdown_id)
  }

  buildAddEdgeDropdown() {
    const edge_dropdown_id = this.buildEdgeDropdownId()
    if (Object.keys(this.props.edges).includes(this.props.node_id) && 
        this.props.edges[this.props.node_id].length === Object.keys(this.props.node_metadata['node']).length-1) {
      return ''
    }
    return (
      <div>
        <div className='d-inline'>
          Add Edge
        </div>
        <div className='d-inline'>
          <select
              name='step_type'
              id={edge_dropdown_id}
          >
            {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
              if (node_id === this.props.node_id) {
                return ''
              }
              if (Object.keys(this.props.edges).includes(this.props.node_id) && 
                  this.props.edges[this.props.node_id].includes(node_id)) {
                return ''
              }
              return (
                <option key={index} value={node_id}>{node_id}</option>
              )
            })}
          </select>
          
        </div>
        <div className='d-inline'>
            <button
                className='btn btn-primary p-1'
                onClick={() => this.doAddNodeEdge()}
            >
              Go
            </button>
          
        </div>
      </div>
    )
  }

  buildDeleteEdgeLink(target_node_id) {
    return (
      <button
          className='btn btn-link'
          onClick={() => this.props.deleteNodeEdge(this.props.node_id, target_node_id)}
      >
        delete
      </button>
    )
  }

  buildEdgeList() {
    if (!Object.keys(this.props.edges).includes(this.props.node_id)) {
      return (
        <div>
          <div className='font-italic'>
            no edges
          </div>
        </div>
      )
    }
    return (
      <div>
        <div className='font-weight-bold'>
          edge list
        </div>
        <ul>
          {this.props.edges[this.props.node_id].map((target_node_id, index) => {
            const delete_link = this.buildDeleteEdgeLink(target_node_id) 
            return (
              <li key={index}>
                <div className='d-inline'>
                  {target_node_id}
                </div>
                <div className='d-inline ml-2'>
                  {delete_link}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  render() {
    const name_field = this.buildNameField()
    const add_edge_dropdown = this.buildAddEdgeDropdown()
    const edge_list = this.buildEdgeList()
    const type_field = this.buildTypeField()
    const entity_id_field = this.buildEntityIdField()
    return (
    <div
        className='row mt-2 card'
    >
      <div className='col'>
        <div className='row'>
          {this.props.node_id}
        </div>
        <div className='row'>
          {name_field}
        </div>
        <div className='row'>
          {type_field}
        </div>
        <div className='row'>
          {entity_id_field}
        </div>
        <div className='row'>
          {edge_list}
        </div>
        <div className='row'>
          {add_edge_dropdown}
        </div>
      </div>
    </div>
    )
  }
}

export default PipelineControls;

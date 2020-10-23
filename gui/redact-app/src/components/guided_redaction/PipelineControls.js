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
        'tier_1_scanners': {
          'template': {},
          'selected_area': {},
          'mesh_match': {},
          'selection_grower': {},
          'ocr': {},
          'ocr_scene_analysis': {},
          'telemetry': {},
        },
        'redact_rules': {},
        'split_and_hash': {},
        'secure_files_import': {},
        'zip': {},
      },
      movie_urls: [],
      input: '',
      addends: {},
      minuends: {},
      subtrahends: {},
      redact_rule_edges: {},
      attribute_search_value: '',
      use_parsed_movies: false,
      json: '',
    }
    this.afterPipelineSaved=this.afterPipelineSaved.bind(this)
    this.deletePipeline=this.deletePipeline.bind(this)
    this.addNode=this.addNode.bind(this)
    this.deleteNode=this.deleteNode.bind(this)
    this.updateNodeValue=this.updateNodeValue.bind(this)
    this.loadPipeline=this.loadPipeline.bind(this)
    this.loadNewPipeline=this.loadNewPipeline.bind(this)
    this.setLocalStateVar=this.setLocalStateVar.bind(this)
  }

  deleteNode(node_id) {
    let deepCopyNodeMetadata = JSON.parse(JSON.stringify(this.state.node_metadata))
    delete deepCopyNodeMetadata['node'][node_id]
    this.setLocalStateVar(
      'node_metadata', 
      deepCopyNodeMetadata,
      (()=>{this.props.displayInsightsMessage('node was added')})
    )
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

  handleAddEntityId(deepCopyNodeMetadata, node_id, value) {
    const node = deepCopyNodeMetadata['node'][node_id]
    // TODO can this become a two liner now?
    const good_values = [
      'template', 'selected_area', 'mesh_match', 'selection_grower', 'ocr', 'ocr_scene_analysis', 'telemetry'
    ]
    if (good_values.includes(node['type'])) {
      deepCopyNodeMetadata['tier_1_scanners'][node['type']][value] = this.props.tier_1_scanners[node['type']][value]
    }
  }

  updateNodeValue(node_id, field_name, value) {
    let deepCopyNodeMetadata = JSON.parse(JSON.stringify(this.state.node_metadata))
    deepCopyNodeMetadata['node'][node_id][field_name] = value
    if (field_name === 'entity_id') {
      this.handleAddEntityId(deepCopyNodeMetadata, node_id, value)
    } 
    this.setLocalStateVar('node_metadata', deepCopyNodeMetadata)
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
      input: this.state.input,
      addends: this.state.addends,
      minuends: this.state.minuends,
      subtrahends: this.state.subtrahends,
      redact_rule_edges: this.state.redact_rule_edges,
      node_metadata: this.state.node_metadata,
      movies: build_movies,
    }
    return pipeline
  }

  afterPipelineSaved(pipeline_response_obj) {
    if (Object.keys(pipeline_response_obj).includes('pipeline_id')) {
      const pipeline_id = pipeline_response_obj['pipeline_id']
      this.setState({'id': pipeline_id})
      this.props.setGlobalStateVar('current_pipeline_id', pipeline_id)
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
    let extra_data = ''
    if (this.state.json && scope === 'input_json') {
        extra_data = this.state.json
    }
    this.props.dispatchPipeline(
      {
        pipeline_id: this.props.current_pipeline_id, 
        scope: scope, 
        extra_data: extra_data,
        use_parsed_movies: this.state.use_parsed_movies,
      }
    )
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
      let addends = {}
      if (Object.keys(content).includes('addends')) {
        addends = content['addends']
      }
      let minuends = {}
      if (Object.keys(content).includes('minuends')) {
        minuends = content['minuends']
      }
      let subtrahends = {}
      if (Object.keys(content).includes('subtrahends')) {
        subtrahends = content['subtrahends']
      }
      let redact_rule_edges = {}
      if (Object.keys(content).includes('redact_rule_edges')) {
        redact_rule_edges= content['redact_rule_edges']
      }
      let input = {}
      if (Object.keys(content).includes('input')) {
        input = content['input']
      }
      this.setState({
        id: pipeline_id,
        name: content['name'],
        description: content['description'],
        attributes: pipeline['attributes'],
        movie_urls: movie_urls,
        edges: content['edges'],
        input: input,
        addends: addends,
        minuends: minuends,
        subtrahends: subtrahends,
        redact_rule_edges: redact_rule_edges,
        node_metadata: content['node_metadata'],
      })
      if (Object.keys(content['node_metadata']).includes('tier_1_scanners')) {
        let deepCopyT1Scanners = JSON.parse(JSON.stringify(this.props.tier_1_scanners))
        for (let i=0; i < Object.keys(content['node_metadata']['tier_1_scanners']).length; i++) {
          const scanner_type = Object.keys(content['node_metadata']['tier_1_scanners'])[i]
          const these_scanners = content['node_metadata']['tier_1_scanners'][scanner_type]
          for (let j=0; j < Object.keys(these_scanners).length; j++) {
            const scanner_id = Object.keys(these_scanners)[j]
            deepCopyT1Scanners[scanner_type][scanner_id] = these_scanners[scanner_id]
          }
        }
        this.props.setGlobalStateVar('tier_1_scanners', deepCopyT1Scanners) 
      }
      if (Object.keys(content['node_metadata']).includes('redact_rules')) {
        let deepCopyRRs = JSON.parse(JSON.stringify(this.props.redact_rules))
        for (let i=0; i < Object.keys(content['node_metadata']['redact_rules']).length; i++) {
          const rr_id = Object.keys(content['node_metadata']['redact_rules'])[i]
          const rr = content['node_metadata']['redact_rules'][rr_id]
          deepCopyRRs[rr_id] = rr
        }
        this.props.setGlobalStateVar('redact_rules', deepCopyRRs) 
      }
    }
    this.props.setGlobalStateVar('current_pipeline_id', pipeline_id)
    this.props.displayInsightsMessage('pipeline has been loaded')
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
//    function anon_func() {
//      this.doSave()
//      when_done()
//    }
//    if (typeof var_name === 'string' || var_name instanceof String) {           
//      // we have been given one key and one value                               
//      this.setState(                                                          
//        {                                                                     
//          [var_name]: var_value,                                              
//        },                                                                    
//        anon_func()                                                           
//      )                                                                       
//    } else {                                                                    
//      // var_name is actaully a dict                                            
//      this.setState(                                                            
//        var_name,                                                               
//        anon_func()                                                             
//      )                                                                         
//    }
//
//
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
          <button
              className='dropdown-item'
              onClick={() => this.doRun('current_movie_as_frames')}
          >
            Selected Movie as Frames
          </button>
          <button
              className='dropdown-item'
              onClick={() => this.doRun('current_frame')}
          >
            Current Frame
          </button>
          <button
              className='dropdown-item'
              onClick={() => this.doRun('input_json')}
          >
            Input JSON
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
      60,
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

  buildInputJson() {
    return (
      <div>
        <div className='d-inline'>
          input json
        </div>
        <div className='d-inline'>
          <textarea
            id='pipeline_input_json'
            cols='60'
            rows='5'
            onChange={
              (event)=>{this.setLocalStateVar('json', event.target.value)}
            }
          />
        </div>
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
    this.setLocalStateVar('attributes', deepCopyAttributes)
  }

  deleteAttribute(name) {
    let deepCopyAttributes = JSON.parse(JSON.stringify(this.state.attributes))
    if (!Object.keys(this.state.attributes).includes(name)) {
      return
    }
    delete deepCopyAttributes[name]
    this.setLocalStateVar('attributes', deepCopyAttributes)
  }

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const id_string = buildIdString(this.state.id, 'pipeline', false)
    const load_button = this.buildLoadButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const name_field = this.buildNameField()
    const description_field = this.buildDescriptionField()
    const attributes_list = this.buildAttributesList()
    const use_parsed_movies_checkbox = this.buildUseParsedMoviesCheckbox()
    const input_json_textarea = this.buildInputJson()
    const header_row = makeHeaderRow(
      'pipelines',
      'pipelines_body',
      (() => this.props.toggleShowVisibility('pipelines'))
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
                {input_json_textarea}
              </div>

              <div className='row mt-2'>
                {attributes_list}
              </div>

              <div className='row'>
                <div className='col'>
                  {sequence_header_row}
                  <div id='pipelines_sequence_body' className='row '>

                    <NodeCardList
                      setLocalStateVar={this.setLocalStateVar}
                      node_metadata={this.state.node_metadata}
                      edges={this.state.edges}
                      input={this.state.input}
                      addends={this.state.addends}
                      minuends={this.state.minuends}
                      subtrahends={this.state.subtrahends}
                      addNode={this.addNode}
                      deleteNode={this.deleteNode}
                      updateNodeValue={this.updateNodeValue}
                      tier_1_scanners={this.props.tier_1_scanners}
                      redact_rule_edges={this.state.redact_rule_edges}
                      redact_rules={this.props.redact_rules}
                      pipelines={this.props.pipelines}
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
      <div className='col border-top m-2 p-2'>
        <div className='row'>
          <div className='col-9 h4'>
            Pipeline Steps
          </div>
          <div className='col-3'>
            {add_button}
          </div>
        </div>
        <div className='row'>
          <div className='col-lg-2'/>
          <div className='col-lg-8'>
            {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
              return (
                <NodeCard
                  key={index}
                  node_id={node_id}
                  node_metadata={this.props.node_metadata}
                  edges={this.props.edges}
                  updateNodeValue={this.props.updateNodeValue}
                  tier_1_scanners={this.props.tier_1_scanners}
                  input={this.props.input}
                  addends={this.props.addends}
                  minuends={this.props.minuends}
                  subtrahends={this.props.subtrahends}
                  setLocalStateVar={this.props.setLocalStateVar}
                  deleteNode={this.props.deleteNode}
                  redact_rule_edges={this.props.redact_rule_edges}
                  redact_rules={this.props.redact_rules}
                  pipelines={this.props.pipelines}
                />
              )
            })}
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

  getSelectForPipelineId() {
    return (
      <select
          name='step_type'
          value={this.props.node_metadata['node'][this.props.node_id]['entity_id']}
          onChange={
            (event) => this.props.updateNodeValue(this.props.node_id, 'entity_id', event.target.value)
          }
      >
        {Object.keys(this.props.pipelines).map((pipeline_id, index) => {
          const pipeline = this.props.pipelines[pipeline_id]
          return (
            <option value={pipeline_id} key={index}>{pipeline['name']}</option>
          )
        })}
      </select>
    )
  }
  getSelectForEntityId() {
    if (this.props.node_metadata['node'][this.props.node_id]['type'] === 'pipeline') {
      return this.getSelectForPipelineId()
    }
    let options = []
    let added_ids = []
    // TODO can this be brought down to a small piece of code, iterating through scanner types?
    options.push(<option value='' key='pipeline_node_entity_id_none'></option>)

    const node_type = this.props.node_metadata['node'][this.props.node_id]['type']
    const good_types = [
      'template', 'selected_area', 'mesh_match', 'selection_grower', 'ocr', 'telemetry', 'ocr_scene_analysis'
    ]
    if (good_types.includes(node_type)) {
      const node_keys =  Object.keys(this.props.tier_1_scanners[node_type])
      for (let i=0; i < node_keys.length; i++) {
        const scanner_id = Object.keys(this.props.tier_1_scanners[node_type])[i]
        const scanner= this.props.tier_1_scanners[node_type][scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
        added_ids.push(scanner_id)
      }
      const t1_node_keys = Object.keys(
        this.props.node_metadata['tier_1_scanners'][node_type]
      )
      for (let i=0; i < t1_node_keys.length; i++) {
        const scanner_id = t1_node_keys[i]
        const scanner= this.props.node_metadata['tier_1_scanners'][node_type][scanner_id]
        if (!added_ids.includes(scanner_id)) {
          options.push(
            <option value={scanner_id} key={scanner_id}>{scanner['name']}</option>
          )
        }
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
    const id_types = [
      'template', 'selected_area', 'mesh_match', 'selection_grower', 'ocr', 'telemetry', 'ocr_scene_analysis'
    ]
    if (
      !id_types.includes(this.props.node_metadata['node'][this.props.node_id]['type'])
      && this.props.node_metadata['node'][this.props.node_id]['type'] !== 'pipeline'
    ) {
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

  nodeFeedsIntoThisNode(node_id) {
    if (!Object.keys(this.props.edges).includes(node_id)) {
      return false
    }
    const edge_ids = this.props.edges[node_id]
    for (let i=0; i < edge_ids.length; i++) {
      if (edge_ids[i] === this.props.node_id) {
        return true
      } else {
        if (this.nodeFeedsIntoThisNode(edge_ids[i])) {
          return true
        }
      }
    }
  }

  buildEdgesField() {
    return (
      <div className='mt-2 mb-2'>
        <div className='font-weight-bold'>
          Outbound Edge for Execution Flow
        </div>
        {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
          if (node_id === this.props.node_id) {
            return '' 
          }
          if (this.nodeFeedsIntoThisNode(node_id)) {
            return ''
          }
          let selected = false
          if (this.props
              && this.props.edges
              && Object.keys(this.props.edges).includes(this.props.node_id)
              && this.props.edges[this.props.node_id].includes(node_id)
          ) {
            selected = true
          }

          const node = this.props.node_metadata['node'][node_id]
          let disp_name = node_id
          if (node['type']) {
            disp_name += ' - ' + node['type']
          }
          if (node['name']) {
            disp_name += ' - ' + node['name']
          }
          return (
            <div
              key={index}
            >
              <div className='d-inline'>
                <input
                  checked={selected}
                  type='checkbox'
                  onChange={() => this.addDeleteEdge(this.props.node_id, node_id)}
                />
              </div>
              <div className='d-inline ml-2'>
                {disp_name}
              </div>
            </div>
          )

        })}
      </div>
    )
  }

  buildDeleteButton() {
    return (
      <button
          className='btn btn-primary p-1 m-1'
          onClick={() => this.props.deleteNode(this.props.node_id)}
      >
        Delete Step
      </button>
    )
  }

  addDeleteEdge(parent_node_id, node_id) {
    let deepCopyEdges = JSON.parse(JSON.stringify(this.props.edges))
    if (Object.keys(deepCopyEdges).includes(parent_node_id)) {
      if (deepCopyEdges[parent_node_id].includes(node_id)) {
        const ind = deepCopyEdges[parent_node_id].indexOf(node_id)
        deepCopyEdges[parent_node_id].splice(ind, 1)
      } else {
        deepCopyEdges[parent_node_id].push(node_id)
      }
    } else {
      deepCopyEdges[parent_node_id] = [node_id]
    }
    this.props.setLocalStateVar('edges', deepCopyEdges)
  }

  addDeleteMinuendSubtrahendAddend(type, parent_node_id, minuend_node_id) {
    let deepCopyMins = JSON.parse(JSON.stringify(this.props[type]))
    if (Object.keys(deepCopyMins).includes(parent_node_id)) {
      if (deepCopyMins[parent_node_id].includes(minuend_node_id)) {
        const ind = deepCopyMins[parent_node_id].indexOf(minuend_node_id)
        deepCopyMins[parent_node_id].splice(ind, 1)
      } else {
        deepCopyMins[parent_node_id].push(minuend_node_id)
      }
    } else {
      deepCopyMins[parent_node_id] = [minuend_node_id]
    }
    this.props.setLocalStateVar(type, deepCopyMins)
  }

  buildMinuendsSubtrahendsAddendsField(ms_type) {
    if (
      this.props.node_metadata['node'][this.props.node_id]['type'] !== 't1_diff'
      && (ms_type === 'minuends' || ms_type === 'subtrahends')
    ) {
      return ''
    }
    if (
      this.props.node_metadata['node'][this.props.node_id]['type'] !== 't1_sum'
      && ms_type === 'addends'
    ) {
      return ''
    }
    const id_types = [
      'template', 'selected_area', 'mesh_match', 'selection_grower', 'ocr', 'telemetry', 'ocr_scene_analysis'
    ]
    let title = 'Minuends'
    if (ms_type === 'subtrahends') {
      title = 'Subtrahends'
    } else if (ms_type === 'addends') {
      title = 'Addends'
    } 

    let select_none_comment = ''
    if (ms_type === 'minuends') {
      select_none_comment = 'selecting none means to use the input for the pipeline'
    } 
    return (
      <div className='mt-2 mb-2'>
        <div className='font-weight-bold'>
          {title}
        </div>
        <div className='d-inline font-italic'>
          {select_none_comment}
        </div>
        {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
          if (node_id === this.props.node_id) {
            return '' 
          }
          if (!id_types.includes(
            this.props.node_metadata['node'][node_id]['type']
          )) {
            return ''
          }
          let ms_selected = false
          if (this.props
              && this.props[ms_type]
              && Object.keys(this.props[ms_type]).includes(this.props.node_id)
              && this.props[ms_type][this.props.node_id].includes(node_id)
          ) {
            ms_selected = true
          }
          const node = this.props.node_metadata['node'][node_id]
          const disp_name = node_id + ' - ' + node['type']

          return (
            <div
              key={index}
            >
              <div className='d-inline'>
                <input
                  checked={ms_selected}
                  type='checkbox'
                  onChange={() => this.addDeleteMinuendSubtrahendAddend(ms_type, this.props.node_id, node_id)}
                />
              </div>
              <div className='d-inline ml-2'>
                {disp_name}
              </div>
            </div>
          )

        })}
      </div>
    )
  }

  buildInputField() {
    if (!this.props.node_metadata['node']) {
      return ''
    }
    const types_without_input = ['t1_diff', 't1_add']
    return (
      <div>
        <div className='d-inline font-weight-bold'>
          Data Input 
        </div>
        <div className='d-inline ml-2'>
          <select
              name='step_input'
              value={this.props.node_metadata['node'][this.props.node_id]['input']}
              onChange={
                (event) => this.props.updateNodeValue(this.props.node_id, 'input', event.target.value)
              }
          >
            <option value=''>Default (output from prev step)</option>
            <option value='parent_job_request'>Parent Job Request</option>
            {Object.keys(this.props.node_metadata['node']).map((node_id, index) => {
              if (node_id === this.props.node_id) {
                return ''
              }
              const node_type = this.props.node_metadata['node'][node_id]['type']
              if (types_without_input.includes(this.props.node_metadata['node'][node_id]['type'])) {
                return ''
              }
              return (
                <option key={index} value={node_id}>{node_id} - {node_type}</option>
              )
            })}
          </select>
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
            <option value='secure_files_import'>secure files import</option>
            <option value='split_and_hash'>split and hash</option>
            <option value='template'>template</option>
            <option value='selected_area'>selected area</option>
            <option value='mesh_match'>mesh match</option>
            <option value='selection_grower'>selection_grower</option>
            <option value='ocr'>ocr</option>
            <option value='ocr_scene_analysis'>ocr scene analysis</option>
            <option value='telemetry'>telemetry</option>
            <option value='pipeline'>pipeline</option>
            <option value='t1_sum'>sum t1 outputs</option>
            <option value='t1_diff'>difference of t1 outputs</option>
            <option value='template_match_chart'>template match chart</option>
            <option value='redact'>redact</option>
            <option value='zip'>zip</option>
            <option value='noop'>noop</option>
          </select>
        </div>
      </div>
    )
  }

  buildFirstIndicator() {
    for (let i=0; i < Object.keys(this.props.edges).length; i++) {
      const ta = this.props.edges[Object.keys(this.props.edges)[i]]
      if (ta.includes(this.props.node_id)) {
        return ''
      }
    }
    return 'first'
  }

  buildLeafIndicator() {
    if (!Object.keys(this.props.edges).includes(this.props.node_id)) {
      return 'leaf'
    }
    if (Object.keys(this.props.edges[this.props.node_id]).length < 1) {
      return 'leaf'
    }
    return ''
  }


  moreThanOneFirstNode() {
    const nodes = Object.keys(this.props.node_metadata['node']).length
    const nodes_with_edges =Object.keys(this.props.edges).length
    if (nodes_with_edges !== (nodes - 1)) {
      return true
    }
  }

  buildNodeStatus() {
    const bg_color_good = '#C2F5A6'
    const bg_color_bad = '#F5B5A6'
    const the_style = {}
    let errors = []
    const t1_id_types = [
      'template', 'selected_area', 'mesh_match', 'selection_grower', 'ocr', 'telemetry', 'ocr_scene_analysis'
    ]
    const node = this.props.node_metadata['node'][this.props.node_id]
    if (!node['type']) {
      errors.push(
        <div key='1'>type is required</div>
      )
    }
    if (t1_id_types.includes(node['type']) && !node['entity_id']) {
      errors.push(
        <div key='2'>entity id is required</div>
      )
    }
    if (this.moreThanOneFirstNode()) {
      errors.push(
        <div key='3'>only one node can be first</div>
      )
    }

    if (errors) {
      the_style['backgroundColor'] = bg_color_bad
    } else {
      the_style['backgroundColor'] = bg_color_good
    }
    return (
      <div 
        style={the_style}
        className='col'
      >
        {errors}
      </div>
    )
  }

  updateRedactRuleEdge(inbound_node_id, rule_id) {
    let deepCopyRREs = JSON.parse(JSON.stringify(this.props.redact_rule_edges))
    if (!Object.keys(deepCopyRREs).includes(this.props.node_id)) {
      deepCopyRREs[this.props.node_id] = {}
    }
    deepCopyRREs[this.props.node_id][inbound_node_id] = rule_id
    this.props.setLocalStateVar( 'redact_rule_edges', deepCopyRREs)

    let deepCopyNM = JSON.parse(JSON.stringify(this.props.node_metadata))
    deepCopyNM['redact_rules'][rule_id] = this.props.redact_rules[rule_id]
    setTimeout((()=>{this.props.setLocalStateVar( 'node_metadata', deepCopyNM)}), 500)
  }

  buildRedactionRulesField() {
    if (!this.props.node_metadata['node']) {
      return ''
    }
    if (this.props.node_metadata['node'][this.props.node_id]['type'] !== 'redact') {
      return ''
    }
    let inbound_node_ids = []
    for (let i=0; i < Object.keys(this.props.edges).length; i++) {
      const nid = Object.keys(this.props.edges)[i]
      if (this.props.edges[nid].includes(this.props.node_id)) {
        inbound_node_ids.push(nid)
      }
    }

    return (
      <div>
        <div className='font-weight-bold'>
          Redact Rules
        </div>
        <div>
          {inbound_node_ids.map((i_node_id, index) => {
            const in_label = i_node_id + ' - ' + this.props.node_metadata['node'][i_node_id]['type']
            let cur_rr = ''

            

            let selected_rr_id = ''
            if (Object.keys(this.props.redact_rule_edges).includes(this.props.node_id)) {
              if (Object.keys(this.props.redact_rule_edges[this.props.node_id]).includes(i_node_id)) {
                selected_rr_id = this.props.redact_rule_edges[this.props.node_id][i_node_id]
                if (Object.keys(this.props.node_metadata['redact_rules']).includes(selected_rr_id)) {
                  selected_rr_id  = this.props.node_metadata['redact_rules'][selected_rr_id]['name']
                }
                cur_rr = '(currently ' + selected_rr_id + ')'
              }
            }
            return (
              <div key={index}>
                <div className='d-inline'>
                  {in_label}
                </div>
                <div className='d-inline font-italic ml-2'>
                  {cur_rr}
                </div>
                <div className='d-inline ml-2'>
                  <select
                      name='whatevs'
                      value={selected_rr_id}
                      onChange={
                        (event) => this.updateRedactRuleEdge(i_node_id, event.target.value)
                      }
                  >
                    <option value=''></option>
                    {Object.keys(this.props.redact_rules).map((rr_id, index2) => {
                      const rr_obj = this.props.redact_rules[rr_id]
                      return (
                        <option key={index2} value={rr_id}>{rr_obj['name']}</option>
                      )
                    })}
                  </select>



                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  render() {
    const delete_button = this.buildDeleteButton()
    const name_field = this.buildNameField()
    const type_field = this.buildTypeField()
    const input_field = this.buildInputField()
    const edges_field = this.buildEdgesField()
    const minuends_field = this.buildMinuendsSubtrahendsAddendsField('minuends')
    const subtrahends_field = this.buildMinuendsSubtrahendsAddendsField('subtrahends')
    const addends_field = this.buildMinuendsSubtrahendsAddendsField('addends')
    const redaction_rules_field = this.buildRedactionRulesField()
    const entity_id_field = this.buildEntityIdField()
    const first_indicator = this.buildFirstIndicator()
    const leaf_indicator = this.buildLeafIndicator()
    const node_status = this.buildNodeStatus()
    return (
    <div
        className='row mt-2 p-1 m-1 card'
    >
      <div className='col'>
        <div className='row'>
          {node_status}
        </div>
        <div className='row'>
          <div className='col-8'>
            {this.props.node_id}
          </div>
          <div className='col-2 font-weight-bold'>
            {first_indicator}
          </div>
          <div className='col-2 font-weight-bold'>
            {leaf_indicator}
          </div>
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
          {edges_field}
        </div>
        <div className='row'>
          {input_field}
        </div>
        <div className='row'>
          {minuends_field}
        </div>
        <div className='row'>
          {subtrahends_field}
        </div>
        <div className='row'>
          {addends_field}
        </div>
        <div className='row'>
          {redaction_rules_field}
        </div>
        <div className='row'>
          {delete_button}
        </div>
      </div>
    </div>
    )
  }
}

export default PipelineControls;

import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  buildLabelAndTextInput,
  buildAttributesAsRows,
  buildAttributesAddRow,
  buildTier1DeleteButton,
  buildTier1LoadButton,
} from './SharedControls'

class PipelineControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      id: '',
      name: '',
      description: '',
      attributes: {},
      steps: [],
      movie_urls: [],
      attribute_search_value: '',
      unsaved_changes: false,
    }
    this.afterPipelineSaved=this.afterPipelineSaved.bind(this)
    this.deletePipeline=this.deletePipeline.bind(this)
    this.addStep=this.addStep.bind(this)
    this.moveStepEarlier=this.moveStepEarlier.bind(this)
    this.moveStepLater=this.moveStepLater.bind(this)
    this.updateStepValue=this.updateStepValue.bind(this)
    this.loadPipeline=this.loadPipeline.bind(this)
    this.loadNewPipeline=this.loadNewPipeline.bind(this)
  }

  addStep() {
    const new_step = {
      type: '',
      name: '',
      entity_id: '',
    }
    let deepCopySteps = JSON.parse(JSON.stringify(this.state.steps))
    deepCopySteps.push(new_step)
    this.setLocalStateVar(
      'steps', 
      deepCopySteps,
      (()=>{this.props.displayInsightsMessage('step was added')})
    )
  }

  updateStepValue(step_position, field_name, value) {
    let deepCopySteps = JSON.parse(JSON.stringify(this.state.steps))
    deepCopySteps[step_position][field_name] = value
    this.setState({'steps': deepCopySteps})
  }

  moveStepEarlier(step_current_position) {
    if (step_current_position === 0) {
      return
    }
    let deepCopySteps = JSON.parse(JSON.stringify(this.state.steps))
    let deepCopyCurStep = JSON.parse(JSON.stringify(this.state.steps[step_current_position]))
    deepCopySteps[step_current_position] = this.state.steps[step_current_position-1]
    deepCopySteps[step_current_position-1] = deepCopyCurStep
    this.setLocalStateVar('steps', deepCopySteps)
  }

  moveStepLater(step_current_position) {
    if (step_current_position >= this.state.steps.length) {
      return
    }
    let deepCopySteps = JSON.parse(JSON.stringify(this.state.steps))
    let deepCopyCurStep = JSON.parse(JSON.stringify(this.state.steps[step_current_position]))
    deepCopySteps[step_current_position] = this.state.steps[step_current_position+1]
    deepCopySteps[step_current_position+1] = deepCopyCurStep
    this.setLocalStateVar('steps', deepCopySteps)
  }

  componentDidMount() {
    this.props.getPipelines()
  }

  makeStepMetadata() {
    let step_metadata = {
      'ocr': {},
      'template': {},
      'selected_area': {},
      'telemetry': {},
      'redact': {},
    }
    for (let i=0; i < this.state.steps.length; i++) {
      const step = this.state.steps[i]
      if (step['type'] === 'ocr' && step['entity_id']) {
        step_metadata['ocr'][step['entity_id']] = this.props.ocr_rules[step['entity_id']]
      } else if (step['type'] === 'template' && step['entity_id']) {
        step_metadata['template'][step['entity_id']] = this.props.templates[step['entity_id']]
      } else if (step['type'] === 'selected_area' && step['entity_id']) {
        step_metadata['selected_area'][step['entity_id']] = this.props.selected_area_metas[step['entity_id']]
      } else if (step['type'] === 'telemetry' && step['entity_id']) {
        step_metadata['telemetry'][step['entity_id']] = this.props.telemetry_rules[step['entity_id']]
      }
    }
    return step_metadata
  }

  getPipelineFromState() {
    let build_movies = {}
    for (let i=0; i < this.state.movie_urls.length; i++) {
      const movie_url = this.state.movie_urls[i]
      if (Object.keys(this.props.movies).includes(movie_url)) {
        build_movies[movie_url] = this.props.movies[movie_url]
      } else {
        build_movies[movie_url] = {}
      }
    }

    const step_metadata = this.makeStepMetadata()
    const pipeline = {
      id: this.state.id,
      name: this.state.name,
      description: this.state.description,
      attributes: this.state.attributes,
      steps: this.state.steps,
      step_metadata: step_metadata,
      movies: build_movies,
    }
    return pipeline
  }

  afterPipelineSaved(pipeline_response_obj) {
    if (Object.keys(pipeline_response_obj).includes('pipeline_id')) {
      const pipeline_id = pipeline_response_obj['pipeline_id']
      this.setLocalStateVar('id', pipeline_id)
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

  doRun() {
  console.log('running a pipeline')
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
        steps: content['steps'],
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
      (()=>{this.addStep()})
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
    return buildInlinePrimaryButton(
      'Run',
      (()=>{this.doRun()})
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

  buildMovieUrlsBox() {
    const movie_urls_string = this.state.movie_urls.join('\n')
    return (
      <div>
        <div className='row'>
        movie urls
        </div>
      <textarea
         cols='80'
         rows='5'
         value={movie_urls_string}
         onChange={(event) => this.setMovieUrls(event.target.value)}
      />
      </div>
    )
  }

  setMovieUrls(movie_urls) {
    if (typeof movie_urls === 'string' || movie_urls instanceof String) {
      movie_urls = movie_urls.split('\n')
    }
    this.setLocalStateVar('movie_urls', movie_urls)
  }

  render() {
    if (!this.props.visibilityFlags['pipelines']) {
      return([])
    }
    const load_button = this.buildLoadButton()
    const save_button = this.buildSaveButton()
    const delete_button = this.buildDeleteButton()
    const run_button = this.buildRunButton()
    const name_field = this.buildNameField()
    const description_field = this.buildDescriptionField()
    const attributes_list = this.buildAttributesList()
    const movie_urls_box = this.buildMovieUrlsBox()
    const header_row = makeHeaderRow(
      'pipelines',
      'pipelines_body',
    )
    const sequence_header_row = ''
//    const sequence_header_row = makeHeaderRow(
//      'sequence',
//      'pipelines_sequence_body'
//    )

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
                {name_field}
              </div>

              <div className='row mt-2'>
                {description_field}
              </div>

              <div className='row mt-2'>
                {movie_urls_box}
              </div>

              <div className='row mt-2'>
                {attributes_list}
              </div>

              <div className='row'>
                <div className='col'>
                  {sequence_header_row}
                  <div id='pipelines_sequence_body' className='row '>

                    <StepCardList
                      steps={this.state.steps}
                      addStep={this.addStep}
                      moveStepEarlier={this.moveStepEarlier}
                      moveStepLater={this.moveStepLater}
                      updateStepValue={this.updateStepValue}
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

class StepCardList extends React.Component {
  render() {
    return (
      <div className='col'>
        <div className='row'>
          <div className='col-lg-3'>
            <button
                className='btn btn-primary p-1'
                onClick={() => this.props.addStep()}
            >
              Add Step
            </button>
          </div>
          <div className='col-lg-6'>
            {this.props.steps.map((step_data, index) => {
              return (
                <StepCard
                  key={index}
                  card_data={step_data}
                  position={index}
                  steps={this.props.steps}
                  moveStepEarlier={this.props.moveStepEarlier}
                  moveStepLater={this.props.moveStepLater}
                  updateStepValue={this.props.updateStepValue}
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

class StepCard extends React.Component {
  buildMoveUpLink() {
    return (
      <button
          className='btn btn-link'
          onClick={() => this.props.moveStepEarlier(this.props.position)}
      >
        move up 
      </button>
    )
  }

  buildMoveDownLink() {
    return (
      <button
          className='btn btn-link ml-5'
          onClick={() => this.props.moveStepLater(this.props.position)}
      >
        move down
      </button>
    )
  }

  buildNameField() {
    if (!this.props.steps) {
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
              value={this.props.steps[this.props.position]['name']}
              onChange={
                (event) => this.props.updateStepValue(this.props.position, 'name', event.target.value)
              }
          />
        </div>
      </div>
    )
  }

  getSelectForEntityId() {
    let options = []
    options.push(<option value='' key='9999sw'></option>)
    if (this.props.steps[this.props.position]['type'] === 'template') {
      for (let i=0; i < Object.keys(this.props.templates).length; i++) {
        const scanner_id = Object.keys(this.props.templates)[i]
        const scanner= this.props.templates[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
    } else if (this.props.steps[this.props.position]['type'] === 'selected_area') {
      for (let i=0; i < Object.keys(this.props.selected_area_metas).length; i++) {
        const scanner_id = Object.keys(this.props.selected_area_metas)[i]
        const scanner= this.props.selected_area_metas[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
    } else if (this.props.steps[this.props.position]['type'] === 'ocr') {
      for (let i=0; i < Object.keys(this.props.ocr_rules).length; i++) {
        const scanner_id = Object.keys(this.props.ocr_rules)[i]
        const scanner= this.props.ocr_rules[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
    } else if (this.props.steps[this.props.position]['type'] === 'telemetry') {
      for (let i=0; i < Object.keys(this.props.telemetry_rules).length; i++) {
        const scanner_id = Object.keys(this.props.telemetry_rules)[i]
        const scanner= this.props.telemetry_rules[scanner_id]
        options.push(
          <option value={scanner_id} key={i}>{scanner['name']}</option>
        )
      }
    }
    return (
      <select
          name='step_type'
          value={this.props.steps[this.props.position]['entity_id']}
          onChange={
            (event) => this.props.updateStepValue(this.props.position, 'entity_id', event.target.value)
          }
      >
        {options}
      </select>
    )
  }

  buildEntityIdField() {
    if (!this.props.steps) {
      return ''
    }
    const id_types = ['template', 'selected_area', 'ocr', 'telemetry']
    if (!id_types.includes(this.props.steps[this.props.position]['type'])) {
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
    if (!this.props.steps) {
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
              value={this.props.steps[this.props.position]['type']}
              onChange={
                (event) => this.props.updateStepValue(this.props.position, 'type', event.target.value)
              }
          >
            <option value=''></option>
            <option value='template'>template</option>
            <option value='selected_area'>selected area</option>
            <option value='ocr'>ocr</option>
            <option value='telemetry'>telemetry</option>
            <option value='split_and_hash'>split and hash</option>
            <option value='redact'>redact</option>
            <option value='zip'>zip</option>
          </select>
        </div>
      </div>
    )
  }

  render() {
    const move_up_link = this.buildMoveUpLink()
    const move_down_link = this.buildMoveDownLink()
    const name_field = this.buildNameField()
    const type_field = this.buildTypeField()
    const entity_id_field = this.buildEntityIdField()
    return (
    <div
        className='row mt-2 card'
    >
      <div className='col'>
        <div className='row'>
    {this.props.position}
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
          {move_up_link}
          {move_down_link}
        </div>
      </div>
    </div>
    )
  }
}

export default PipelineControls;

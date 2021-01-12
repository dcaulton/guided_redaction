import React from 'react';
import {
  makeHeaderRow,
  buildInlinePrimaryButton,
  doTier1Save,
  buildTier1LoadButton,
  buildTier1DeleteButton,
  buildLabelAndTextInput,
  buildIdString,
  makePlusMinusRowLight,
  buildAttributesAddRow,
  buildAttributesAsRows,
  buildLabelAndDropdown,
} from './SharedControls'

class JobEvalPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      mode: '',
      annotate_view_mode: 'tile',
      id: '',
      description: '',
      content: {},
      something_changed: false,
      job_eval_objectives: {},
    }
    this.setLocalStateVar = this.setLocalStateVar.bind(this)
    this.afterJeoSave = this.afterJeoSave.bind(this)
    this.loadJeo = this.loadJeo.bind(this)
    this.getJobEvalObjectives= this.getJobEvalObjectives.bind(this)
  }

  afterJeoSave(response_obj) {
    let jeo_id = ''
    if (Object.keys(response_obj).includes('id')) {
      jeo_id = response_obj['id']
    }
    this.getJobEvalObjectives(
      (() => {this.loadJeo(jeo_id)})
    )
  }

  afterJeoDelete(response_obj) {
    this.getJobEvalObjectives()
  }

  getJeoFromState() {
    const jeo = {
      id: this.state.id,
      description: this.state.description,
      content: this.state.content,
    }
    return jeo
  }

  async getJobEvalObjectives(when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    await this.props.fetch(the_url, {
      method: 'GET',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setState({
        'job_eval_objectives': responseJson,
       })
    })
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  async saveJobEvalObjective(jeo_object, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    const payload = jeo_object
    let response = await this.props.fetch(the_url, {
      method: 'POST',
      headers: this.props.buildJsonHeaders(),
      body: JSON.stringify(payload),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  async deleteJeo(jeo_id, when_done=(()=>{})) {
    let the_url = this.props.getUrl('job_eval_objectives_url')
    let response = await this.props.fetch(the_url + '/' + jeo_id, {
      method: 'DELETE',
      headers: this.props.buildJsonHeaders(),
    })
    .then((response) => {
      when_done(response)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }

  loadJeo(jeo_id) {
    const jeo = this.state.job_eval_objectives[jeo_id]
    let content_obj = {}
    if (jeo.content.length > 0) {
      content_obj = JSON.parse(jeo.content)
    }
    this.setState({
      id: jeo.id,
      description: jeo.description,
      content: content_obj,
    })
  }

  loadNewJeo() {
    this.setState({
      id: '',
      description: '',
      content: {},
    })
  }

  buildJeoDeleteButton() {
    const jeo_keys = Object.keys(this.state.job_eval_objectives)
    return (
      <div className='d-inline'>
        <button
            key='jeo_delete_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='arglebargle12'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Delete
        </button>
        <div className='dropdown-menu' aria-labelledby='arglebargle12'>
          {jeo_keys.map((jeo_key, index) => {
            const jeo = this.state.job_eval_objectives[jeo_key]
            const the_name = jeo['description']
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.deleteJeo(jeo_key, (()=>{this.afterJeoDelete()}))}
              >
                {the_name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  
  buildJeoLoadButton() {
    const jeo_keys = Object.keys(this.state.job_eval_objectives)
    return (
      <div key='x34' className='d-inline'>
        <button
            key='jeo_load_button'
            className='btn btn-primary ml-2 dropdown-toggle'
            type='button'
            id='arglebargle123'
            data-toggle='dropdown'
            area-haspopup='true'
            area-expanded='false'
        >
          Load
        </button>
        <div className='dropdown-menu' aria-labelledby='arglebargle123'>
          {jeo_keys.map((jeo_key, index) => {
            const jeo = this.state.job_eval_objectives[jeo_key]
            const the_name = jeo['description']
            return (
              <button
                  className='dropdown-item'
                  key={index}
                  onClick={() => this.loadJeo(jeo_key)}
              >
                {the_name}
              </button>
            )
          })}
          <button
              className='dropdown-item'
              key='nada_surf'
              onClick={() => this.loadNewJeo()}
          >
            new
          </button>
        </div>
      </div>
    )
  }
  
  buildJeoSaveButton() {
    if (!this.state.something_changed) {
      return ''
    }
    return (
      <button
          className='btn btn-primary'
          onClick={() => this.doSave()}
      >
        Save
      </button>
    )
  }

  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    function anon_func() {
      when_done()
    }
    this.setState(
      {
        [var_name]: var_value,
        something_changed: true,
      },
      anon_func
    )
  }

  componentDidMount() {
    this.getJobEvalObjectives()
    this.loadNewJeo()
  }

  buildModeNav() {
    let targets = []
    targets = [{'': 'home'}, 
               {'annotate': 'annotate exemplar movie'}, 
               {'review': 'review non-exemplar job'}, 
               {'compare': 'compare jobs'}
    ] 
    if (targets.length > 0) {
      return (
        <div className='row'>
          {targets.map((target_obj, index) => {
            const target_key = Object.keys(target_obj)[0]
            const target_display_text = target_obj[target_key]
            return (
              <div className='col-3' key={index}>
                <div className='row'>
                <button
                  className='btn btn-link'
                  onClick={() => {this.setState({'mode': target_key})}}
                >
                  {target_display_text}
                </button>
                </div>
              </div>
            )
          })}
        </div>
      )
    }
  }

  buildAnnotatePanel() {
    return (
      <div className='col'>
        <div className='row'>
          annotate stuff
        </div>
      </div>
    )
  }

  buildReviewPanel() {
    return (
      <div className='col'>
        <div className='row'>
          review stuff
        </div>
      </div>
    )
  }

  buildComparePanel() {
    return (
      <div className='col'>
        <div className='row'>
          compare stuff
        </div>
      </div>
    )
  }

  buildObjectivePanel() {
    const show_hide_general = makePlusMinusRowLight('general', 'objective_div')
    const load_button = this.buildJeoLoadButton()
    const save_button = this.buildJeoSaveButton()
    const delete_button = this.buildJeoDeleteButton()

    return (
      <div className='col-9'>
        {show_hide_general}
        <div
          id='objective_div'
          className='collapse row'
        >
          <div className='col'>

            <div className='row'>
              <div className='d-inline'>
                {load_button}
              </div>
              <div className='d-inline ml-2'>
                {save_button}
              </div>
              <div className='d-inline ml-2'>
                {delete_button}
              </div>
            </div>

            <div className='row'>
              <div className='d-inline'>
                Id: 
              </div>
              <div className='d-inline'>
                {this.state.id}
              </div>
            </div>

            <div className='row'>
              <div className='ml-2 mt-2'>
                <div>
                  Description:
                </div>
                <div
                    className='d-inline'
                >
                  <textarea
                    id='jeo_description'
                    cols='60'
                    rows='3'
                    value={this.state.description}
                    onChange={(event) => this.setLocalStateVar('description', event.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  doSave(when_done=(()=>{})) {
    const jeo_object = this.getJeoFromState()
    this.saveJobEvalObjective(jeo_object, this.afterJeoSave)
  }

  render() {
    const mode_nav = this.buildModeNav()
    const objective_data = this.buildObjectivePanel()
    let title = 'Job Evaluation - Home'
    let page_content = ''
    if (!this.state.mode) {
    } else if (this.state.mode === 'annotate') {
      page_content = this.buildAnnotatePanel()
      title = 'Job Eval - Annotate'
    } else if (this.state.mode === 'review') {
      page_content = this.buildReviewPanel()
      title = 'Job Eval - Review '
    } else if (this.state.mode === 'compare') {
      page_content = this.buildComparePanel()
      title = 'Job Eval - Compare'
    }
    return (
      <div className='col ml-2'>
        <div>
          {mode_nav}
        </div>
        <div className='row h2'>
          {title}
        </div>

        <div className='row'>
          {objective_data}
        </div>

        <div className='row'>
          {page_content}
        </div>
      </div>
    )

  }
}

export default JobEvalPanel;

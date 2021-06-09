import React from 'react';
import {
  buildLabelAndTextInput,
  makeHeaderRow,
} from './SharedControls'

class SetToolsControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      operation: '',
      job_ids: [],
      attr_name: '',
      attr_operator: '',
      attr_value: '',
      filter_criteria: {},
      mandatory_job_ids: [],
    }
  }

  buildAttrOperatorField(){
    const operators = {
      'equals': 'equals',
      'in_list': 'is in list',
      'matches_regex_list': 'matches regexes',
    }
    return (
      <div>
          <select
              name='set_tools_attr_operator'
              value={this.state.attr_operator}
              onChange={(event) => this.setLocalStateVar('attr_operator', event.target.value)}
          >
            <option value=''></option>
            {Object.keys(operators).map((operation_id, index) => {
              return (
                <option value={operation_id} key={index}>{operators[operation_id]}</option>
              )
            })}
          </select>
      </div>
    )
  }

  buildOperationField(){
    const operations = [
      'intersect',
      't1_sum',
      't1_diff',
      't1_filter',
    ]
    return (
      <div>
        <div className='d-inline'>
          Operation
        </div>
        <div className='d-inline ml-2'>
          <select
              name='set_tools_operation'
              value={this.state.operation}
              onChange={(event) => this.setLocalStateVar('operation', event.target.value)}
          >
            <option value=''></option>
            {operations.map((operation, index) => {
              return (
                <option value={operation} key={index}>{operation}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

// TODO I cloned this from data sifter, we need to centralize this logic soon
  setLocalStateVar(var_name, var_value, when_done=(()=>{})) {
    if (typeof var_name === 'string' || var_name instanceof String) {
      // we have been given one key and one value
      if (this.state[var_name] === var_value) {
        when_done()
      } else {
        this.setState(
          {
            [var_name]: var_value,
          },
          when_done
        )
      }
    } else {
      // var_name is actually a dict, second argument could be a callback
      let the_callback = (()=>{})
      if (typeof(var_value) === 'function') {
        the_callback = var_value
      }
      function anon_func() {
        the_callback()
      }
      this.setState(
        var_name,
        anon_func
      )
    }
  }

  toggleLocalChecked(item_type, the_id) {
    let deepCopyIds = JSON.parse(JSON.stringify(this.state[item_type]))
    if (deepCopyIds.includes(the_id)) {
      const the_index = deepCopyIds.indexOf(the_id)
      deepCopyIds.splice(the_index, 1)
    } else {
      deepCopyIds.push(the_id)
    }
    this.setLocalStateVar(item_type, deepCopyIds)
  }

  buildJobsPicker() {
    let use_mandatory = false
    let title = 'Jobs'
    if ((this.state.operation !== 'intersect')  &&
       (this.state.operation !== 't1_filter') &&
       (this.state.operation !== 't1_sum')) {
      return ''
    }
    if (this.state.operation === 't1_sum') {
      title = 'Addends'
      use_mandatory = true
    }
    let mandatory_header_column = <td></td>
    if (use_mandatory) {
      mandatory_header_column = (
        <td>mandatory?</td>
      )
    }
    return (
      <div>
        <div className='h5'>
          {title}
        </div>
        <table className='table table-striped'>
          <thead>
            <tr className='font-weight-bold p-2'>
              <td>select</td>
              <td>job id</td>
              <td>operation</td>
              {mandatory_header_column}
            </tr>
          </thead>
          <tbody>
          {this.props.jobs.map((job, index) => {
            let job_checked = ''
            if (this.state.job_ids.includes(job.id)) {
              job_checked = 'checked'
            }
            let mandatory_column = <td></td>
            if (use_mandatory) {
              let mandatory_job_checked = ''
              if (this.state.mandatory_job_ids.includes(job.id)) {
                mandatory_job_checked = 'checked'
              }
              mandatory_column = (
                <td>
                  <input
                    className='ml-2 mr-2 mt-1'
                    checked={mandatory_job_checked}
                    type='checkbox'
                    onChange={() => this.toggleLocalChecked('mandatory_job_ids', job.id)}
                  />
                </td>
              )
            }

            return (
              <tr key={index}>

                <td>
                  <input
                    className='ml-2 mr-2 mt-1'
                    checked={job_checked}
                    type='checkbox'
                    onChange={() => this.toggleLocalChecked('job_ids', job.id)}
                  />
                </td>

                <td>
                  {job.id}
                </td>

                <td>
                  {job.operation}
                </td>

                {mandatory_column}

              </tr>
            )
          })}
          </tbody>
        </table>
      </div>
    )
  }

  submitJob() {
    let pass_data = {
      operation: this.state.operation,
    }
    if (this.state.operation === 'intersect') {
      pass_data['job_ids'] = this.state.job_ids
      this.props.submitInsightsJob('intersect', pass_data)
    }
    if (this.state.operation === 't1_sum') {
      pass_data['job_ids'] = this.state.job_ids
      pass_data['mandatory_job_ids'] = this.state.mandatory_job_ids
      this.props.submitInsightsJob('t1_sum', pass_data)
    } else if (this.state.operation === 't1_filter') {
      pass_data['job_ids'] = this.state.job_ids
      pass_data['filter_criteria'] = this.state.filter_criteria
      this.props.submitInsightsJob('t1_filter', pass_data)
    }
  }

  buildSubmitButton() {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.submitJob()}
        >
          Submit Job
        </button>
      </div>
    )
  }

  buildAttrNameField() {
    return buildLabelAndTextInput(
      this.state.attr_name,
      '',
      'set_tools_attr_name',
      'name',
      20,
      ((value)=>{this.setLocalStateVar('attr_name', value)})
    )
  }

  buildAttrValueField() {
    return buildLabelAndTextInput(
      this.state.attr_value,
      '',
      'set_tools_attr_value',
      'value',
      20,
      ((value)=>{this.setLocalStateVar('attr_value', value)})
    )
  }

  buildAddFilterCriterionButton() {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.addFilterCriterion()}
        >
          Add
        </button>
      </div>
    )
  }

  buildDeleteFilterCriteriaButton(attr_name) {
    return (
      <div>
        <button
            className='btn btn-primary'
            onClick={() => this.deleteFilterCriterion(attr_name)}
        >
          Del
        </button>
      </div>
    )
  }

  deleteFilterCriterion(attr_name) {
    let deepCopyFcs = JSON.parse(JSON.stringify(this.state.filter_criteria))
    delete deepCopyFcs[attr_name]
    this.setLocalStateVar('filter_criteria', deepCopyFcs)
  }

  addFilterCriterion() {
    let deepCopyFcs = JSON.parse(JSON.stringify(this.state.filter_criteria))
    const build_obj = {
      operator: this.state.attr_operator,
      value: this.state.attr_value,
    }
    deepCopyFcs[this.state.attr_name] = build_obj
    const new_state_obj = {
      filter_criteria: deepCopyFcs,
      attr_name: '',
      attr_operator: '',
      attr_value: '',
    }
    this.setLocalStateVar(new_state_obj)
  }

  buildNewFilterCriteriaLine() {
    const attr_name_field = this.buildAttrNameField()
    const attr_oper_field = this.buildAttrOperatorField()
    const attr_value_field = this.buildAttrValueField()
    const add_button = this.buildAddFilterCriterionButton()
    return (
      <div className='border p-2 ml-2'>
        <div className='h5'>
          Add Filter Criteria
        </div>
        <table>
          <thead>
            <tr>
              <td>
                attr name
              </td>
              <td>
                operator
              </td>
              <td>
                value
              </td>
              <td>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {attr_name_field}
              </td>
              <td className='pt-2'>
                {attr_oper_field}
              </td>
              <td>
                {attr_value_field}
              </td>
              <td>
                {add_button}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  buildFilterCriteriaLines() {
    return (
      <div className='border p-2 ml-2'>
        <div className='h5'>
          Existing Filter Criteria
        </div>

        <table>
          <thead>
            <tr>
              <td>
                attr name
              </td>
              <td>
                operator
              </td>
              <td>
                value
              </td>
              <td>
              </td>
            </tr>
          </thead>
          <tbody>
          {Object.keys(this.state.filter_criteria).map((attr_name, index) => {
            const attr_oper = this.state.filter_criteria[attr_name]['operator']
            const attr_value = this.state.filter_criteria[attr_name]['value']
            const delete_button = this.buildDeleteFilterCriteriaButton(attr_name)
            return (
              <tr>
                <td>
                  {attr_name}
                </td>
                <td className='pt-2'>
                  {attr_oper}
                </td>
                <td>
                  {attr_value}
                </td>
                <td>
                  {delete_button}
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>

      </div>
    )
  }

  buildFilterCriteriaDialog() {
    if (this.state.operation !== 't1_filter') {
      return ''
    }
    const new_attr_line = this.buildNewFilterCriteriaLine()
    const attr_lines = this.buildFilterCriteriaLines()

    return (
      <div>
        <div className='h4'>
          filter criteria
        </div>
        {new_attr_line}
        {attr_lines}
      </div>
    )
  }

  render() {
    if (!this.props.visibilityFlags['set_tools']) {
      return([])
    }
    const header_row = makeHeaderRow(
      'set tools',
      'set_tools_body',
      (() => this.props.toggleShowVisibility('set_tools'))
    )
    const jobs_picker = this.buildJobsPicker()
    const filter_criteria_dialog = this.buildFilterCriteriaDialog()
    const operation_field = this.buildOperationField()
    const submit_button = this.buildSubmitButton()

    return (
        <div className='row bg-light rounded mt-3'>
          <div className='col'>

            {header_row}

            <div 
                id='set_tools_body' 
                className='row collapse'
            >
              <div id='set_tools_main' className='col'>

                <div className='row mt-2 ml-2'>
                  {operation_field}
                </div>

                <div className='row mt-2 ml-2'>
                  {jobs_picker}
                </div>

                <div className='row mt-2 ml-2'>
                  {filter_criteria_dialog}
                </div>

                <div className='row mt-2 ml-2'>
                  {submit_button}
                </div>

              </div>
            </div>

          </div>
        </div>
    )
  }
}

export default SetToolsControls;

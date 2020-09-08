import React from 'react';

class Workflows extends React.Component {
  constructor(props) {
    super(props);
    this.gotoWorkflowStep=this.gotoWorkflowStep.bind(this)
  }

  static gotoPrevStep(workflows, workflow_callbacks, setGlobalStateVar) {
    const cur_step_id = workflows.active_step
    const cur_wf = workflows[workflows.active_workflow]
    let cur_index = -1
    for (let i=0; i < cur_wf.steps.length; i++) {
      const step = cur_wf.steps[i]
      if (step.id === cur_step_id) {
        cur_index = i
      }
    }
    if (cur_index === 0) { //first step, bail
      return
    }
    const prev_step = cur_wf.steps[cur_index - 1]
    this.gotoWorkflowStep(prev_step.id, workflows, workflow_callbacks, setGlobalStateVar)
  }

  static gotoNextStep(workflows, workflow_callbacks, setGlobalStateVar) {
    const cur_step_id = workflows.active_step
    const cur_wf = workflows[workflows.active_workflow]
    let cur_index = -1
    for (let i=0; i < cur_wf.steps.length; i++) {
      const step = cur_wf.steps[i]
      if (step.id === cur_step_id) {
        cur_index = i
      }
    }
    if (cur_index === (cur_wf.steps.length - 1)) { //last step, nothing to skip to
      return
    }
    const next_step = cur_wf.steps[cur_index + 1]
    this.gotoWorkflowStep(next_step.id, workflows, workflow_callbacks, setGlobalStateVar)
  }

  static workOnCurStepHasBeenPerformed(cur_step, workflow_callbacks, setGlobalStateVar) {
    if (Object.keys(workflow_callbacks).includes(cur_step['workHasBeenPerformed'])) {
      const answer = workflow_callbacks[cur_step['workHasBeenPerformed']]()
      if (answer === true) {
        return true
      } 
      return false
    }
    return true
  }

  
  static getCurStep(workflows) {
    const cur_step_id = workflows.active_step
    const cur_wf = workflows[workflows.active_workflow]
    for (let i=0; i < cur_wf.steps.length; i++) {
      const step = cur_wf.steps[i]
      if (step.id === cur_step_id) {
        return step
      }
    }
  }

  static stepIsFirstStep(workflows) {
    const cur_wf = workflows[workflows.active_workflow]
    if (cur_wf.steps[0].id === workflows.active_step) {
      return true
    }
    return false
  }

  static buildWorkflowBottomNav(workflows, workflow_callbacks, setGlobalStateVar) {
    if (!workflows || !workflows.active_workflow || !workflows.active_step) {
      return ''
    }
    const cur_step = this.getCurStep(workflows)
    const step_name = cur_step.display_name

    let back_button = ''
    if (!this.stepIsFirstStep(workflows)) {
      back_button = (
        <div className='ml-2 d-inline'>
          <button
            className='btn btn-primary'
            onClick={()=>{
              this.gotoPrevStep(workflows, workflow_callbacks, setGlobalStateVar)
            }}
          >
            Back
          </button>
        </div>
      )
    }

    let next_button = ''
    let skip_button = ''
    if (this.workOnCurStepHasBeenPerformed(cur_step, workflow_callbacks)) {
      next_button = (
        <div className='ml-2 d-inline'>
          <button
            className='btn btn-primary'
            onClick={()=>{
              this.gotoNextStep(workflows, workflow_callbacks, setGlobalStateVar)
            }}
          >
            Next
          </button>
        </div>
      )
    } else {
      skip_button = (
        <div className='ml-2 d-inline'>
          <button
            className='btn btn-primary'
            onClick={()=>{
              this.gotoNextStep(workflows, workflow_callbacks, setGlobalStateVar)
            }}
          >
            Skip
          </button>
        </div>
      )
    }


    return (
      <div className='col'>
        <div className='d-inline'>
          current step:
        </div>
        <div className='d-inline font-weight-bold ml-2'>
          {step_name}
        </div>
        <div className='d-inline'>
          {back_button}
        </div>
        <div className='d-inline'>
          {skip_button}
        </div>
        <div className='d-inline'>
          {next_button}
        </div>
      </div>
    )                                                                           
  }

  static get precision_learning_workflow() {
    return {
      'statuses': {
        1: '',
        2: '',
        3: '',
        4: '',
        5: '',
        6: '',
        7: '',
      },
      'steps': [
        {
          'id': 1,
          'required': true,
          'display_name': 'Load Movie', 
          'reachable_steps': [2, 3, 4, 5, 6, 7, 8],
          'onStart': 'startLoadMovie', // a key in workflow_callbacks
          'onRollback': '', // a key in workflow_callbacks
          'onComplete': '', // a key in workflow_callbacks, when completed
          'testPreconditions': '', // do we have what we need to start this step?
          'workHasBeenPerformed': 'movieHasBeenLoaded', // true lets us show the next button
        },
        {
          'id': 2,
          'required': true,
          'display_name': 'Select Frames', 
          'reachable_steps': [3, 4, 5, 6, 7, 8],
          'onStart': 'startCaptureImages',
          'onRollback': 'activateSourceMovie',
          'onComplete': 'activateSequenceMovie',
          'testPreconditions': 'movieHasBeenLoaded',
          'workHasBeenPerformed': 'sequenceImagesExist',
        },
        {
          'id': 3,
          'required': false,
          'display_name': 'Create Templates', 
          'reachable_steps': [4, 5, 6, 7, 8],
          'onStart': 'startBuildTemplates',
          'onRollback': '',
          'onComplete': '',
          'testPreconditions': 'sequenceImagesExist',
          'workHasBeenPerformed': '',
        },
        {
          'id': 4,
          'required': false,
          'display_name': 'Scan Templates', 
          'reachable_steps': [5, 6, 7, 8],
          'onStart': 'startScanTemplates',
          'onRollback': 'redactRollback',
          'onComplete': '',
          'testPreconditions': 'sequenceImagesExist',
          'workHasBeenPerformed': '',
        },
        {
          'id': 5,
          'required': false,
          'display_name': 'Redact Images', 
          'reachable_steps': [6, 7, 8],
          'onStart': 'startRedact',
          'onRollback': 'redactRollback',
          'onComplete': '',
          'testPreconditions': 'sequenceImagesExist',
          'workHasBeenPerformed': 'redactedSequenceImagesExist',
        },
        {
          'id': 6,
          'required': false,
          'display_name': 'Illustrate Images', 
          'reachable_steps': [7, 8],
          'onStart': 'startIllustrate',
          'onRollback': 'illustrateRollback',
          'onComplete': '',
          'testPreconditions': 'sequenceImagesExist',
          'workHasBeenPerformed': 'illustratedSequenceImagesExist',
        },
        {
          'id': 7,
          'required': false,
          'display_name': 'Build Animated Images', 
          'reachable_steps': [8],
          'onStart': 'startAnimate',
          'onRollback': '',
          'onComplete': '',
          'testPreconditions': 'sequenceImagesExist',
          'workHasBeenPerformed': 'animatedSequenceImagesExist',
        },
        {
          'id': 8,
          'required': true,
          'display_name': 'Go to Precision Learning', 
          'reachable_steps': [],
          'onStart': '',
          'onRollback': '',
          'onComplete': '', 
          'testPreconditions': 'startPrecisionLearning', 
          'workHasBeenPerformed': '',
        },
      ],
    }
  }

  static getWorkflowFirstIncompleteStepId(the_workflow, workflow_callbacks) {
    let active_step_id = the_workflow.steps[0].id
    for (let i=0; i < the_workflow.steps.length; i++) {
      const step = the_workflow.steps[i]
      active_step_id = step.id

      if (step.testPreconditions) {
        const result = workflow_callbacks[step.testPreconditions]()
        if (result !== true) {
            return the_workflow.steps[i-1].id
        } 
      }
    }
    return active_step_id
  }

  static setActiveWorkflow(
      active_workflow_name, 
      workflows, 
      workflow_callbacks, 
      setGlobalStateVar
  ) {
    let deepCopyWorkflows = JSON.parse(JSON.stringify(workflows))
    deepCopyWorkflows['active_workflow'] = active_workflow_name
    if (active_workflow_name) {
      const active_workflow = workflows[active_workflow_name]
      const active_step_id = this.getWorkflowFirstIncompleteStepId(
        active_workflow,
        workflow_callbacks
      ) 
      deepCopyWorkflows['active_step'] = active_step_id
      for (let i=0; i < active_workflow.steps.length; i++) {
        const step = active_workflow.steps[i]
        if (step.id < active_step_id) {
          deepCopyWorkflows[active_workflow_name].statuses[step.id] = 'complete'
          if (step.onComplete) {
            workflow_callbacks[step.onComplete]()
          }
        } else if (step.id === active_step_id) {
          deepCopyWorkflows[active_workflow_name].statuses[step.id] = 'active'
          if (step.onStart) {
            workflow_callbacks[step.onStart]()
          }
        } else if (step.id > active_step_id) {
          deepCopyWorkflows[active_workflow_name].statuses[step.id] = ''
        }
      }
    }
    setGlobalStateVar('workflows', deepCopyWorkflows)
  }

  static getWorkflowStepState(step_id, workflows) {
    if (!step_id) {
      return ''
    }
    if (!workflows.active_workflow) {
      return ''
    }
    const active_wf = workflows[workflows.active_workflow]
    if (workflows.active_step === step_id) {
      return 'active'
    }
    return active_wf.statuses[step_id]
  }

  static getWorkflowSteps(step_id, cur_wf, cur_step_id, direction) {
    let cur_step = {}
    let skipped_steps = []
    let new_step = {}
    if (direction === 'forward') {
      for (let i=0; i < cur_wf.steps.length; i++) {
        const step = cur_wf.steps[i]
        if (step.id === cur_step_id) {
          cur_step = step
          continue
        }
        if (Object.keys(cur_step).length > 0 && step.id !== step_id) {
          skipped_steps.push(step)
          continue
        }
        if (step.id === step_id) {
          new_step = step
          break
        }
      }
    } else {
      for (let i=cur_wf.steps.length - 1; i >= 0; i--) {
        const step = cur_wf.steps[i]
        if (step.id > cur_step_id) {
          continue
        }
        if (Object.keys(new_step).length > 0) {
          continue
        }
        if (step.id === cur_step_id) {
          cur_step = step
          continue
        }
        if (Object.keys(cur_step).length > 0  && step.id !== step_id) {
          skipped_steps.push(step)
          continue
        }
        if (step.id === step_id) {
          new_step = step
          break
        }
      }
    }
    return {
      'cur_step': cur_step,
      'skipped_steps': skipped_steps,
      'new_step': new_step,
    }
  }

  static gotoWorkflowStep(step_id, workflows, workflow_callbacks, setGlobalStateVar) {
    let deepCopyWorkflows = JSON.parse(JSON.stringify(workflows))
    const cur_wf_id = workflows.active_workflow
    const cur_wf = deepCopyWorkflows[cur_wf_id]
    const cur_step_id = workflows.active_step
    if (step_id > cur_step_id) { // if going forward
      let steps = this.getWorkflowSteps(step_id, cur_wf, cur_step_id, 'forward')
      let cur_step = steps['cur_step']
      let skipped_steps = steps['skipped_steps']
      let new_step = steps['new_step']
      // see if we have the necessary conditions to reach new_step
      if (new_step.testPreconditions) {
        const result = workflow_callbacks[new_step.testPreconditions]()
        if (result !== true) {
          setGlobalStateVar('message', result)
          return
        }
      }
      // wrap up cur_step
      if (cur_step.onComplete) {
        workflow_callbacks[cur_step.onComplete]()
      }
      deepCopyWorkflows[cur_wf_id]['statuses'][cur_step.id] = 'complete'
      // wrap up skipped_steps
      for (let j=0; j < skipped_steps.length;j++) {
        const skipped_step = skipped_steps[j]
        if (skipped_step.onSkip) {
          workflow_callbacks[skipped_step.onSkip]()
        }
        deepCopyWorkflows[cur_wf_id]['statuses'][skipped_step.id] = 'skipped'
      }
      // set up new_step
      if (new_step.onStart) {
        workflow_callbacks[new_step.onStart]()
      }
      deepCopyWorkflows[cur_wf_id]['statuses'][new_step.id] = 'active'
      deepCopyWorkflows.active_step = new_step.id
    } else {  // if going to a previous step in the workflow
      let steps = this.getWorkflowSteps(step_id, cur_wf, cur_step_id, 'backward')
      let cur_step = steps['cur_step']
      let skipped_steps = steps['skipped_steps']
      let new_step = steps['new_step']
      // wrap up cur_step
      if (cur_step.onRollback) {
        workflow_callbacks[cur_step.onRollback]()
      }
      deepCopyWorkflows[cur_wf_id]['statuses'][cur_step.id] = ''

      // wrap up reverse skipped_steps
      for (let j=0; j < skipped_steps.length;j++) {
        const skipped_step = skipped_steps[j]
        if (skipped_step.onSkip) {
          workflow_callbacks[skipped_step.onRollback]()
        }
        deepCopyWorkflows[cur_wf_id]['statuses'][skipped_step.id] = ''
      }
      // if desired step was skipped before, run start routine, 
      // otherwise, just make it active with whatever its state was 
      //   when the system had when it was last used
      if (new_step.onStart) {
        workflow_callbacks[new_step.onStart]()
      }
      deepCopyWorkflows[cur_wf_id]['statuses'][new_step.id] = 'active'
      deepCopyWorkflows.active_step = new_step.id
    }
    setGlobalStateVar('workflows', deepCopyWorkflows)
  }

  static buildWorkflowButtonBar(workflows, workflow_callbacks, setGlobalStateVar) {
    if (workflows && !workflows.active_workflow) {
      return ''
    }
    const wf_steps = workflows[workflows.active_workflow].steps
    let reachable_steps = []
    let cur_step = {}
    if (workflows.active_workflow) {
      const cur_wf = workflows[workflows.active_workflow]
      for (let i=0; i < cur_wf.steps.length; i++) {
        if (cur_wf.steps[i].id === workflows.active_step) {
          cur_step = cur_wf.steps[i]
        }
      }
      reachable_steps = cur_step.reachable_steps
    }

    const top_div_style = {
    }
    return (
      <div>
        <div 
          className='row mt-2 btn-group btn-block'
          style={top_div_style}
        >
        {wf_steps.map((step, index) => {
          let button_style = {
            'borderRadius': '0 0 0 0',
            'borderRight': '1px solid white',
            'xpaddingLeft': '2em',
            'xpaddingRight': '2em',
          }
          if (index === 0) {
            button_style['borderRadius'] = '75px 10px 10px 75px'
          } else if (index === wf_steps.length - 1) {
            button_style['borderRadius'] = '10px 75px 75px 10px'
            delete button_style['borderRight']
          } 
          const wf_step_state = this.getWorkflowStepState(step.id, workflows)
          let wf_button_classnames = ''
          if (wf_step_state === 'active') {
            wf_button_classnames = 'btn btn-primary'
            button_style['backgroundColor'] = '#0c3a64'
          } else if (wf_step_state === 'complete' || wf_step_state === 'skipped') {
            wf_button_classnames = 'btn btn-light border'
          } else {
            wf_button_classnames = 'btn'
            button_style['backgroundColor'] = '#bbb'
            button_style['color'] = '#fff'
          } 
          let the_onclick = (()=>{})
          if (reachable_steps.includes(step.id)) {
            the_onclick = (
              () => this.gotoWorkflowStep(
                step.id, 
                workflows, 
                workflow_callbacks, 
                setGlobalStateVar
              )
            )
          } else if (step.id < cur_step.id) {
            the_onclick = (
              () => this.gotoWorkflowStep(
                step.id, 
                workflows, 
                workflow_callbacks, 
                setGlobalStateVar
              )
            )
          }
          return (
              <button 
                key={index}
                style={button_style}
                onClick={the_onclick}
                className={wf_button_classnames}
              >
                {step.display_name}
              </button>
            )
        })}
        </div>
      </div>
    )
  }

}

export default Workflows;

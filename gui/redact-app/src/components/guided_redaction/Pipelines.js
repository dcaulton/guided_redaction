import React from 'react';

class Pipelines extends React.Component {

  static buildFetchSplitHashPipelineObject() {
    let node_metadata = {
      'node': {},
    }
    const node_1 = {
      id: '1',
      name: 'fetch node',
      type: 'secure_files_import',
      entity_id: '',
      scope: '',
    }
    const node_2 = {
      id: '2',
      name: 'split and hash node',
      type: 'split_and_hash',
      entity_id: '',
      scope: '',
    }
    node_metadata['node']['1'] = node_1
    node_metadata['node']['2'] = node_2
    const edges = {
      '1': ['2'],
    }
    const pipeline = {
      name: 'fetch_split_hash_secure_file',
      description: 'fetch split and hash secure file',
      attributes: {},
      edges: edges,
      node_metadata: node_metadata,
      movies: {},
    }
    return pipeline
  }

  static buildOcrRedactPipelineObject(ocr_rule, pipeline_name) {
    let node_metadata = {
      'tier_1_scanners': {
        'template': {},
        'selected_area': {},
        'ocr': {},
        'telemetry': {},
      },
      'node': {},
    }
    node_metadata['tier_1_scanners']['ocr'][ocr_rule['id']] = ocr_rule
    const node_1 = {
      id: '1',
      name: 'ocr node',
      type: 'ocr',
      entity_id: ocr_rule['id'],
      scope: '',
    }
    const node_2 = {
      id: '2',
      name: 'redact node',
      type: 'redact',
      entity_id: '',
      scope: '',
    }
    node_metadata['node']['1'] = node_1
    node_metadata['node']['2'] = node_2
    const edges = {
      '1': ['2'],
    }
    const pipeline = {
      name: pipeline_name,
      description: 'scan ocr and redact for ocr rule ' + ocr_rule['id'],
      attributes: {
        auto_delete_age: '7days',
      },
      edges: edges,
      node_metadata: node_metadata,
      movies: {},
    }
    return pipeline
  }

  static buildTemplateRedactPipelineObject(
      template_id, 
      pipeline_name, 
      tier_1_scanners
  ) {
    let node_metadata = {
      'tier_1_scanners': {
        'template': {},
        'selected_area': {},
        'ocr': {},
        'telemetry': {},
      },
      'node': {},
    }
    const template = tier_1_scanners['template'][template_id]
    node_metadata['tier_1_scanners']['template'][template_id] = template
    const node_1 = {
      id: '1',
      name: 'template node',
      type: 'template',
      entity_id: template_id,
      scope: '',
    }
    const node_2 = {
      id: '2',
      name: 'redact node',
      type: 'redact',
      entity_id: '',
      scope: '',
    }
    node_metadata['node']['1'] = node_1
    node_metadata['node']['2'] = node_2
    const edges = {
      '1': ['2'],
    }
    const pipeline = {
      name: pipeline_name,
      description: 'scan template and redact for template ' + template['name'],
      attributes: {
        auto_delete_age: '7days',
      },
      edges: edges,
      node_metadata: node_metadata,
      movies: {},
    }
    return pipeline
  }

  static getPipelineForName(the_name, pipelines) {
    for (let i=0; i < Object.keys(pipelines).length; i++) {
      const pipeline_id = Object.keys(pipelines)[i]
      const pipeline = pipelines[pipeline_id]
      if (pipeline['name'] === the_name) {
        return pipeline
      }
    }
  }

  static async getPipelines(fetch, getUrl, setGlobalStateVar, buildJsonHeaders) {
    let the_url = getUrl('pipelines_url')
    await fetch(the_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (Object.keys(responseJson).includes('pipelines')) {
        const pipelines_list = responseJson['pipelines']
        let pipelines_hash = {}
        for (let i=0; i < pipelines_list.length; i++) {
          pipelines_hash[pipelines_list[i]['id']] = pipelines_list[i]
        }
        setGlobalStateVar('pipelines', pipelines_hash)
      }
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async deletePipeline(
      the_uuid, 
      when_done=(()=>{}), 
      getUrl, 
      buildJsonHeaders, 
      fetch, 
      setGlobalStateVar
  ) {
    let the_url = getUrl('pipelines_url') + '/' + the_uuid
    await fetch(the_url, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    })
    .then(() => {
      this.getPipelines(fetch, getUrl, setGlobalStateVar, buildJsonHeaders)
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async savePipelineToDatabase(
      pipeline_obj, 
      when_done=(()=>{}), 
      getUrl, 
      buildJsonHeaders, 
      fetch, 
      setGlobalStateVar
  ) {
    let description_string = ''
    if (Object.keys(pipeline_obj).includes('description')) {
      description_string = pipeline_obj['description']
    }
    let response = await fetch(getUrl('pipelines_url'), {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({
        name: pipeline_obj['name'],
        description: description_string,
        content: pipeline_obj,
      }),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.getPipelines(fetch, getUrl, setGlobalStateVar, buildJsonHeaders)
      when_done(responseJson)
    })
    .catch((error) => {
      console.error(error)
    })
    await response
  }
}

export default Pipelines;

import React from 'react';

class Workbooks extends React.Component {

  static setWorkbooks(the_workbooks, setGlobalStateVar) {
    if (!the_workbooks.length) {
      setGlobalStateVar({
        workbooks: the_workbooks,
        current_workbook_id: '',
        current_workbook_name: 'workbook 1',
      })
    } else {
      setGlobalStateVar('workbooks', the_workbooks)
    }
  }

  static async deleteOldWorkbooks(getUrl, fetch, buildJsonHeaders) {
    let the_url = getUrl('delete_old_workbooks_url')
    await fetch(the_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async getWorkbooks(getUrl, fetch, buildJsonHeaders, user_id, setGlobalStateVar) {
    let the_url = getUrl('workbooks_url')
    the_url += '?x=1'
    if (user_id) {
      the_url += '&user_id=' + user_id
    }
    await fetch(the_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      this.setWorkbooks(responseJson['workbooks'], setGlobalStateVar)
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async saveWorkbook(
      when_done=(()=>{}), 
      workbook_name, 
      the_state, 
      current_workbook_name, 
      user_id,
      buildJsonHeaders,
      getUrl,
      fetch,
      setGlobalStateVar
  ) {
    let current_user = ''
    if (user_id) {
      current_user = user_id
    }
    let wb_name = workbook_name
    if (!wb_name) {
        wb_name = current_workbook_name
    }
    let data_to_save = {
      state_data: the_state,
      owner: current_user,
      name: wb_name,
    }
    await fetch(getUrl('workbooks_url'), {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify(data_to_save),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      if (workbook_name) {
        setGlobalStateVar({
          current_workbook_id: responseJson['workbook_id'],
          current_workbook_name: workbook_name,
        })
      } else {
        setGlobalStateVar({
          current_workbook_id: responseJson['workbook_id']
        })
      }
      this.getWorkbooks(getUrl, fetch, buildJsonHeaders, user_id)
      return responseJson
    })
    .then((responseJson) => {
      when_done(responseJson['workbook_id'])
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async loadWorkbook(
      workbook_id, 
      when_done=(()=>{}), 
      setGlobalStateVar, 
      fetch, 
      getUrl, 
      buildJsonHeaders, 
      getJobs
  ) {
    if (workbook_id === '-1') {
      setGlobalStateVar({
        current_workbook_id: '',
      })
      when_done()
      return
    }
    let wb_url = getUrl('workbooks_url') + '/' + workbook_id
    await fetch(wb_url, {
      method: 'GET',
      headers: buildJsonHeaders(),
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const dont_add_keys = ['workbooks', 'jobs', 'workbooks_url', 'whenDoneTarget']
      let wb = responseJson['workbook']
      let wb_state_data = JSON.parse(wb.state_data)
      let wb_keys = Object.keys(wb_state_data)
      let new_state = {}
      for (let j=0; j < wb_keys.length; j++) {
        let state_data_key = wb_keys[j]
        if (!dont_add_keys.includes(state_data_key)) {
          new_state[state_data_key] = wb_state_data[state_data_key]
        }
      } 
      new_state['current_workbook_name'] = wb.name
      new_state['current_workbook_id'] = wb.id
      setGlobalStateVar(new_state)
    })
    .then(() => {
      getJobs()
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }

  static async deleteWorkbook(
      workbook_id, 
      when_done=(()=>{}), 
      getUrl, 
      fetch, 
      buildJsonHeaders, 
      user_id
  ) {
    let the_url = getUrl('workbooks_url')+ '/' + workbook_id
    await fetch(the_url, {
      method: 'DELETE',
      headers: buildJsonHeaders(),
    })
    .then(() => {
      this.getWorkbooks(getUrl, fetch, buildJsonHeaders, user_id)
    })
    .then(() => {
      when_done()
    })
    .catch((error) => {
      console.error(error);
    })
  }
}

export default Workbooks;

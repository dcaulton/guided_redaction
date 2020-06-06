import React from 'react';
import {
  makePlusMinusRowLight,
} from './SharedControls'

class ScannerSearchControls extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      attribute_search_name: '',
      attribute_search_value: '',
    }
  }

  doGetScanners() {
    const attr_search_name = document.getElementById(this.props.search_attribute_name_id).value
    const attr_search_value = document.getElementById(this.props.search_attribute_value_id).value
    this.setState({
      attribute_search_name: attr_search_name,
      attribute_search_value: attr_search_value,
    })
    this.props.getScanners()
  }

  importAllScanners() {
    const matches = this.getMatchingScanners() 
    for (let i=0; i < matches.length; i++) {
      const match = matches[i]
      this.props.importScanner(match['id'])
    }
    this.props.displayInsightsMessage('All ' + this.props.search_type + 's have been imported')
  }

  getMatchingScanners() {
    let matches = []
    for (let i=0; i < this.props.scanners.length; i++) {
      const scanner = this.props.scanners[i]
      if (scanner['type'] === this.props.search_type) {
        if (this.state.attribute_search_name || this.state.attribute_search_value) {
          for (let j=0; j < Object.keys(scanner['attributes']).length; j++) {
            const attr_name = Object.keys(scanner['attributes'])[j]
            const attr_value = scanner['attributes'][attr_name]
            if ((attr_name === this.state.attribute_search_name) && 
                (attr_value === this.state.attribute_search_value)) {
              matches.push(scanner)
            }
          }
        } else {
          matches.push(scanner)
        }
      }
    }
    return matches
  }

  getDatabaseScannersList() {
    const matches = this.getMatchingScanners() 
    if (matches.length === 0) {
      return ''
    }
    let style = {
      'fontSize': '10px',
    }
    return (
      <div>
        <div className='font-weight-bold ml-3 mt-3'>
          Search Results
        </div>
        <table 
          className='table-striped'
          style={style}
        >
          <thead>
            <tr>
              <th scope='col'>
                <button
                  className='btn btn-primary'
                  style={style}
                  onClick={() => this.importAllScanners()}
                >
                  Import All
                </button>
              </th>
              <th scope='col' className='p-1 text-center'>name</th>
              <th scope='col' className='p-1 text-center'>created</th>
              <th scope='col' className='p-1 text-center'>attributes</th>
              <th scope='col' className='p-1 text-center'>metadata</th>
              <th scope='col'></th>
            </tr>
          </thead>
          <tbody>
          {matches.map((match, index) => {
            let attributes = []
            for (let i=0; i < Object.keys(match['attributes']).length; i++) {
              const attrib_name = Object.keys(match['attributes'])[i]
              const attrib_value = match['attributes'][attrib_name]
              const key_val='attrib_'+i.toString()
              attributes.push(
                <div key={key_val}>
                  <div className='d-inline'>
                    {attrib_name} :
                  </div>
                  <div className='d-inline ml-2'>
                    {attrib_value}
                  </div>
                </div>
              )
            }
            let meta = []
            for (let i=0; i < Object.keys(match['content_metadata']).length; i++) {
              const meta_name = Object.keys(match['content_metadata'])[i]
              const meta_value = match['content_metadata'][meta_name]
              const key_val='meta_'+i.toString()
              meta.push(
                <div key={key_val}>
                  <div className='d-inline'>
                    {meta_name} :
                  </div>
                  <div className='d-inline ml-1'>
                    {meta_value}
                  </div>
                </div>
              )
            }
            return (
              <tr key={index}>
                <td className='p-1'>
                  <button
                    className='btn btn-primary'
                    style={style}
                    onClick={() => this.props.importScanner(
                      match['id'],
                      (()=> {this.props.displayInsightsMessage(this.props.search_type + ' has been imported')})
                    )}
                  >
                    Import
                  </button>
                </td>
                <td className='p-1'>
                  {match['name']}
                </td>
                <td className='p-1 border-left'>
                  {match['created_on'].substring(0, 16)}
                </td>
                <td className='p-1 border-left'>
                  {attributes}
                </td>
                <td className='p-1 border-left'>
                  {meta}
                </td>
                <td className='p-1'>
                  <button
                    className='btn btn-primary'
                    style={style}
                    onClick={() => this.props.deleteScanner(match['id'])}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
          </tbody>
        </table>
      </div>
    )
  }

  render() {
    const database_scanners_list = this.getDatabaseScannersList()
    const display_name_title = this.props.search_type + ' attribute name'
    const display_value_title = this.props.search_type + ' attribute value'
    const hide_div_id = 'hide_div_' + Math.floor(Math.random(1000000, 9999999)*1000000000).toString()
    const show_hide_line = makePlusMinusRowLight('database', hide_div_id)


    return (
      <div className='col'>
        {show_hide_line}
        <div 
            id={hide_div_id}
            className='collapse row'
        >
          <div className='row mb-2'>
            <div className='col-lg-2'>
              Search by Attribute:
            </div>
            <div className='col-lg-4'>
              <div>
                Name
              </div>
              <div>
                <input 
                  id={this.props.search_attribute_name_id}
                  size='20'
                  title={display_name_title}
                />
              </div>
            </div>
            <div className='col-lg-4'>
              <div>
                Value
              </div>
              <div>
                <input 
                  id={this.props.search_attribute_value_id}
                  size='20'
                  className='ml-2'
                  title={display_value_title}
                />
              </div>
            </div>
            <div className='col-lg-2'>
              <div className='ml-2 mr-2'>
                <button
                  className='btn btn-primary mt-4' 
                  onClick={() => this.doGetScanners()}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
          <div>
            {database_scanners_list}
          </div>
        </div>
      </div>
    )
  }

}

export default ScannerSearchControls;

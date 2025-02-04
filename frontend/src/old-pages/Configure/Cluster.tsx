// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

//
// Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
// with the License. A copy of the License is located at
//
// http://aws.amazon.com/apache2.0/
//
// or in the "LICENSE.txt" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and
// limitations under the License.

// Fameworks
import * as React from 'react'
import i18next from 'i18next'
import {Trans, useTranslation} from 'react-i18next'
import {useSelector} from 'react-redux'
import {findFirst, getIn} from '../../util'

// UI Elements
import {
  Checkbox,
  CheckboxProps,
  Container,
  FormField,
  Header,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components'

// State / Model
import {getState, setState, useState, clearState} from '../../store'
import {LoadAwsConfig} from '../../model'

// Components
import {CustomAMISettings} from './Components'
import {useFeatureFlag} from '../../feature-flags/useFeatureFlag'
import {createComputeResource as singleCreate} from './Queues/SingleInstanceComputeResource'
import {createComputeResource as multiCreate} from './Queues/MultiInstanceComputeResource'
import {MultiUser, multiUserValidate} from './MultiUser'
import {
  NonCancelableCustomEvent,
  NonCancelableEventHandler,
} from '@cloudscape-design/components/internal/events'
import TitleDescriptionHelpPanel from '../../components/help-panel/TitleDescriptionHelpPanel'
import {useHelpPanel} from '../../components/help-panel/HelpPanel'
import {useCallback} from 'react'
import {SelectProps} from '@cloudscape-design/components/select/interfaces'
import {OsFormField} from './Cluster/OsFormField'
import {
  slurmAccountingValidateAndSetErrors,
  SlurmSettings,
} from './SlurmSettings/SlurmSettings'
import InfoLink from '../../components/InfoLink'
import {ClusterNameField} from './Cluster/ClusterNameField'
import {validateClusterNameAndSetErrors} from './Cluster/clusterName.validators'
import Loading from '../../components/Loading'

// Constants
const errorsPath = ['app', 'wizard', 'errors', 'cluster']
const configPath = ['app', 'wizard', 'config']
const loadingPath = ['app', 'wizard', 'source', 'loading']

const selectQueues = (state: any) =>
  getState(state, ['app', 'wizard', 'config', 'Scheduling', 'SlurmQueues'])
const selectVpc = (state: any) => getState(state, ['app', 'wizard', 'vpc'])
const selectAwsSubnets = (state: any) => getState(state, ['aws', 'subnets'])

function clusterValidate() {
  const vpc = getState(['app', 'wizard', 'vpc'])
  const region = getState(['app', 'wizard', 'config', 'Region'])
  const editing = getState(['app', 'wizard', 'editing'])
  const customAmiEnabled = getState(['app', 'wizard', 'customAMI', 'enabled'])
  const customAmi = getState(['app', 'wizard', 'config', 'Image', 'CustomAmi'])
  const multiUserEnabled = getState(['app', 'wizard', 'multiUser']) || false
  let valid = true

  setState([...errorsPath, 'validated'], true)

  if (!editing && !vpc) {
    setState(
      [...errorsPath, 'vpc'],
      i18next.t('wizard.cluster.validation.VpcSelect'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'vpc'])
  }

  if (!region) {
    setState(
      [...errorsPath, 'region'],
      i18next.t('wizard.cluster.validation.regionSelect'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'region'])
  }

  if (customAmiEnabled && !customAmi) {
    setState(
      [...errorsPath, 'customAmi'],
      i18next.t('wizard.cluster.validation.customAmiSelect'),
    )
    valid = false
  } else {
    clearState([...errorsPath, 'customAmi'])
  }

  if (multiUserEnabled && !multiUserValidate()) {
    valid = false
  } else {
    clearState([...errorsPath, 'multiUser'])
  }

  if (!editing) {
    const clusterNameValid = validateClusterNameAndSetErrors()
    if (!clusterNameValid) {
      valid = false
    }
  }

  const accountingValid = slurmAccountingValidateAndSetErrors()
  if (!accountingValid) {
    valid = false
  }

  return valid
}

function itemToOption(
  item: string | [string, string] | null,
): SelectProps.Option | null {
  if (!item) return null
  let label, value

  if (typeof item == 'string') {
    label = item
    value = item
  } else {
    ;[value, label] = item
  }

  return {label, value}
}

function RegionSelect() {
  const {t} = useTranslation()
  const region =
    useState(['app', 'wizard', 'config', 'Region']) || 'Please select a region.'
  const editing = useState(['app', 'wizard', 'editing'])
  const config = useState(configPath)
  const isMultipleInstanceTypesActive = useFeatureFlag(
    'queues_multiple_instance_types',
  )
  const error = useState([...errorsPath, 'region'])

  const handleChange = useCallback(
    ({detail}: NonCancelableCustomEvent<SelectProps.ChangeDetail>) => {
      clearState([...errorsPath, 'region'])

      const chosenRegion = detail.selectedOption.value
      if (!chosenRegion) return

      /**
       * Clear wizard state
       *
       * We keep the part of the state that is necessary
       * to continue with the experience
       */
      const {page, source, clusterName, errors} =
        getState(['app', 'wizard']) || {}
      setState(['app', 'wizard'], {page, source, clusterName, errors})

      initWizardState(config, chosenRegion, isMultipleInstanceTypesActive)

      LoadAwsConfig(chosenRegion)
    },
    [config, isMultipleInstanceTypesActive],
  )

  const supportedRegions = [
    'af-south-1',
    'ap-east-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-south-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ca-central-1',
    'cn-north-1',
    'cn-northwest-1',
    'eu-central-1',
    'eu-north-1',
    'eu-south-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'me-south-1',
    'sa-east-1',
    'us-east-1',
    'us-east-2',
    'us-gov-east-1',
    'us-gov-west-1',
    'us-west-1',
    'us-west-2',
  ]

  return (
    <>
      <FormField
        label={t('wizard.cluster.region.label')}
        description={t('wizard.cluster.region.description')}
        errorText={error}
      >
        <Select
          disabled={editing}
          selectedOption={itemToOption(
            // @ts-expect-error TS(2345) FIXME: Argument of type 'string[] | undefined' is not ass... Remove this comment to see the full error message
            findFirst(supportedRegions, (r: string) => {
              return r === region
            }),
          )}
          onChange={handleChange}
          // @ts-expect-error TS(2322) FIXME: Type '({ label: Element; value: string; } | undefi... Remove this comment to see the full error message
          options={supportedRegions.map(itemToOption)}
          placeholder={t('wizard.cluster.region.placeholder')}
          selectedAriaLabel={t('wizard.cluster.region.selectedAriaLabel')}
        />
      </FormField>
    </>
  )
}

function initWizardState(
  config: Record<string, unknown>,
  region: string,
  isMultipleInstanceTypesActive: boolean,
) {
  const customAMIEnabled = getIn(config, ['Image', 'CustomAmi']) ? true : false
  const queueName = 'queue-1'
  setState(['app', 'wizard', 'customAMI', 'enabled'], customAMIEnabled)
  setState([...configPath, 'HeadNode', 'InstanceType'], 't2.micro')
  setState([...configPath, 'Scheduling', 'Scheduler'], 'slurm')
  setState([...configPath, 'Region'], region)
  setState([...configPath, 'Image', 'Os'], 'alinux2')
  setState(
    [...configPath, 'Scheduling', 'SlurmQueues'],
    [
      {
        Name: queueName,
        AllocationStrategy: isMultipleInstanceTypesActive
          ? 'lowest-price'
          : undefined,
        ComputeResources: [
          isMultipleInstanceTypesActive
            ? multiCreate(queueName, 0)
            : singleCreate(queueName, 0),
        ],
      },
    ],
  )
}

function VpcSelect() {
  const {t} = useTranslation()
  const vpcs = useState(['aws', 'vpcs']) || []
  const vpc = useSelector(selectVpc) || ''
  const error = useState([...errorsPath, 'vpc'])
  const subnets = useSelector(selectAwsSubnets)
  const queues = useSelector(selectQueues)
  const editing = useState(['app', 'wizard', 'editing'])

  const VpcName = (vpc: any) => {
    if (!vpc) return null
    var tags = vpc.Tags
    if (!tags) {
      return null
    }
    tags = vpc.Tags.filter((t: any) => {
      return t.Key === 'Name'
    })
    return tags.length > 0 ? tags[0].Value : null
  }

  const vpcToDisplayOption = (vpc: any) => {
    return vpc
      ? {
          label: (
            <div style={{minWidth: '200px'}}>
              {VpcName(vpc) ? VpcName(vpc) : vpc.VpcId}
            </div>
          ),
          value: vpc.VpcId,
        }
      : {
          label: <div style={{minWidth: '200px'}}>Select a VPC</div>,
          value: null,
        }
  }

  const vpcToOption = (vpc: any) => {
    return vpc
      ? {
          label: (
            <div style={{minWidth: '200px'}}>
              {vpc.VpcId} {VpcName(vpc) && `(${VpcName(vpc)})`}
            </div>
          ),
          value: vpc.VpcId,
        }
      : {
          label: <div style={{minWidth: '200px'}}>Select a VPC</div>,
          value: null,
        }
  }

  const setVpc = (vpcId: any) => {
    setState(['app', 'wizard', 'vpc'], vpcId)
    setState([...errorsPath, 'vpc'], null)
    const headNodeSubnetPath = [
      'app',
      'wizard',
      'config',
      'HeadNode',
      'Networking',
      'SubnetId',
    ]

    const filteredSubnets =
      subnets &&
      subnets.filter((s: any) => {
        return s.VpcId === vpcId
      })
    if (filteredSubnets.length > 0) {
      const subnetSet = new Set(filteredSubnets)
      var subnet = filteredSubnets[0]
      if (!subnetSet.has(getState(headNodeSubnetPath)))
        setState(headNodeSubnetPath, subnet.SubnetId)
      if (queues)
        queues.forEach((_queue: any, i: any) => {
          const queueSubnetPath = [
            'app',
            'wizard',
            'config',
            'Scheduling',
            'SlurmQueues',
            i,
            'Networking',
            'SubnetIds',
          ]
          if (!subnetSet.has(getState(queueSubnetPath)))
            setState(queueSubnetPath, [subnet.SubnetId])
        })
    }
  }

  return (
    <FormField
      errorText={error}
      description={t('wizard.cluster.vpc.description')}
      label={t('wizard.cluster.vpc.label')}
    >
      <Select
        disabled={editing}
        // @ts-expect-error TS(2322) FIXME: Type '{ label: JSX.Element; value: any; }' is not ... Remove this comment to see the full error message
        selectedOption={vpcToDisplayOption(
          findFirst(vpcs, x => x.VpcId === vpc),
        )}
        onChange={({detail}) => {
          setVpc(detail.selectedOption.value)
        }}
        options={vpcs.map(vpcToOption)}
        selectedAriaLabel={t('wizard.cluster.vpc.selectedAriaLabel')}
      />
    </FormField>
  )
}

function Cluster() {
  const {t} = useTranslation()
  const editing = useState(['app', 'wizard', 'editing'])
  let config = useState(configPath)
  let clusterConfig = useState(['app', 'wizard', 'clusterConfigYaml']) || ''
  let wizardLoaded = useState(['app', 'wizard', 'loaded'])
  let multiUserEnabled = useState(['app', 'wizard', 'multiUser']) || false
  let defaultRegion = useState(['aws', 'region']) || ''
  const loading = !!useState(loadingPath)
  const region = useState(['app', 'selectedRegion']) || defaultRegion
  const isMultiuserClusterActive = useFeatureFlag('multiuser_cluster')
  const isMultipleInstanceTypesActive = useFeatureFlag(
    'queues_multiple_instance_types',
  )

  useHelpPanel(<ClusterPropertiesHelpPanel />)

  React.useEffect(() => {
    // Don't overwrite the config if we go back, still gets overwritten
    // after going forward so need to consider better way of handling this
    if (clusterConfig) return

    // Load these values once when creating the component
    if (!wizardLoaded) {
      setState(['app', 'wizard', 'loaded'], true)
      if (!config) {
        initWizardState(config, region, isMultipleInstanceTypesActive)
      }
    }
  }, [
    region,
    config,
    clusterConfig,
    wizardLoaded,
    isMultipleInstanceTypesActive,
  ])

  const handleMultiUserChange: NonCancelableEventHandler<
    CheckboxProps.ChangeDetail
  > = ({detail}) => {
    if (!detail.checked) {
      clearState(['app', 'wizard', 'config', 'DirectoryService'])
    }
    setState(['app', 'wizard', 'multiUser'], detail.checked)
  }

  return loading ? (
    <Loading />
  ) : (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            info={<InfoLink helpPanel={<ClusterPropertiesHelpPanel />} />}
          >
            {t('wizard.cluster.clusterProperties.title')}
          </Header>
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <ClusterNameField />
          <RegionSelect />
          <OsFormField />
          <CustomAMISettings
            basePath={configPath}
            appPath={['app', 'wizard']}
            errorsPath={errorsPath}
            validate={clusterValidate}
          />
          <VpcSelect />
          {isMultiuserClusterActive && (
            <FormField>
              <Checkbox
                disabled={editing}
                description={t('wizard.cluster.multiUser.checkbox.description')}
                checked={multiUserEnabled}
                onChange={handleMultiUserChange}
              >
                <Trans i18nKey="wizard.cluster.multiUser.checkbox.label" />
              </Checkbox>
            </FormField>
          )}
        </SpaceBetween>
      </Container>
      {multiUserEnabled && <MultiUser />}
      <SlurmSettings />
    </SpaceBetween>
  )
}

const ClusterPropertiesHelpPanel = () => {
  const {t} = useTranslation()
  const footerLinks = React.useMemo(
    () => [
      {
        title: t('wizard.cluster.help.networkLink.title'),
        href: t('wizard.cluster.help.networkLink.href'),
      },
      {
        title: t('wizard.cluster.help.adLink.title'),
        href: t('wizard.cluster.help.adLink.href'),
      },
      {
        title: t('wizard.cluster.help.amiLink.title'),
        href: t('wizard.cluster.help.amiLink.href'),
      },
      {
        title: t('global.help.configurationProperties.title'),
        href: t('global.help.configurationProperties.href'),
      },
    ],
    [t],
  )
  return (
    <TitleDescriptionHelpPanel
      title={t('wizard.cluster.title')}
      description={<Trans i18nKey="wizard.cluster.help.main" />}
      footerLinks={footerLinks}
    />
  )
}

export {Cluster, clusterValidate, itemToOption}

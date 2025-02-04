import {
  Box,
  Button,
  ColumnLayout,
  FormField,
  Input,
  Checkbox,
  SpaceBetween,
} from '@cloudscape-design/components'
import {useEffect} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import {clearState, getState, setState, useState} from '../../../store'
import {HelpTextInput, InstanceSelect} from '../Components'
import {
  QueueValidationErrors,
  SingleInstanceComputeResource,
} from './queues.types'

const queuesPath = ['app', 'wizard', 'config', 'Scheduling', 'SlurmQueues']
const queuesErrorsPath = ['app', 'wizard', 'errors', 'queues']
const defaultInstanceType = 'c5n.large'

export function ComputeResource({index, queueIndex, computeResource}: any) {
  const parentPath = [...queuesPath, queueIndex]
  const queue = useState(parentPath)
  const computeResources = useState([...parentPath, 'ComputeResources'])
  const path = [...parentPath, 'ComputeResources', index]
  const errorsPath = [...queuesErrorsPath, queueIndex, 'computeResource', index]
  const typeError = useState([...errorsPath, 'type'])

  const tInstances = new Set<string>(['t2.micro', 't2.medium'])
  const gravitonInstances = new Set<string>([])

  const instanceTypePath = [...path, 'InstanceType']
  const instanceType: string = useState(instanceTypePath)
  const memoryBasedSchedulingEnabledPath = [
    'app',
    'wizard',
    'config',
    'Scheduling',
    'SlurmSettings',
    'EnableMemoryBasedScheduling',
  ]
  const enableMemoryBasedScheduling = useState(memoryBasedSchedulingEnabledPath)

  const disableHTPath = [...path, 'DisableSimultaneousMultithreading']
  const disableHT = useState(disableHTPath)

  const efaPath = [...path, 'Efa']

  const efaInstances = new Set(useState(['aws', 'efa_instance_types']))
  const enableEFAPath = [...path, 'Efa', 'Enabled']
  const enableEFA = useState(enableEFAPath) || false

  const enablePlacementGroupPath = [
    ...parentPath,
    'Networking',
    'PlacementGroup',
    'Enabled',
  ]

  const minCount = useState([...path, 'MinCount'])
  const maxCount = useState([...path, 'MaxCount'])

  const {t} = useTranslation()

  const remove = () => {
    setState(
      [...parentPath, 'ComputeResources'],
      [
        ...computeResources.slice(0, index),
        ...computeResources.slice(index + 1),
      ],
    )
  }

  const setMinCount = (staticCount: any) => {
    const dynamicCount = maxCount - minCount
    if (staticCount > 0)
      setState([...path, 'MinCount'], !isNaN(staticCount) ? staticCount : 0)
    else clearState([...path, 'MinCount'])
    setState(
      [...path, 'MaxCount'],
      (!isNaN(staticCount) ? staticCount : 0) +
        (!isNaN(dynamicCount) ? dynamicCount : 0),
    )
  }

  const setMaxCount = (dynamicCount: any) => {
    const staticCount = minCount
    setState(
      [...path, 'MaxCount'],
      (!isNaN(staticCount) ? staticCount : 0) +
        (!isNaN(dynamicCount) ? dynamicCount : 0),
    )
  }

  const setSchedulableMemory = (
    schedulableMemoryPath: string[],
    schedulableMemory: string,
  ) => {
    let schedulableMemoryNumber = parseInt(schedulableMemory)
    if (enableMemoryBasedScheduling && !isNaN(schedulableMemoryNumber)) {
      setState(schedulableMemoryPath, schedulableMemoryNumber)
    } else {
      clearState(schedulableMemoryPath)
    }
  }

  const setDisableHT = (disable: any) => {
    if (disable) setState(disableHTPath, disable)
    else clearState(disableHTPath)
  }

  const setEnableEFA = (enable: any) => {
    if (enable) {
      setState(enableEFAPath, enable)
      setState(enablePlacementGroupPath, enable)
    } else {
      clearState(efaPath)
      clearState(enablePlacementGroupPath)
    }
  }

  const setInstanceType = (instanceType: any) => {
    // setting the instance type on the queue happens in the component
    // this updates the name which is derived from the instance type
    setState(
      [...path, 'Name'],
      `${queue.Name}-${instanceType.replace('.', '')}`,
    )

    if (!getState(enableEFAPath) && efaInstances.has(instanceType))
      setEnableEFA(true)
    else if (getState(enableEFAPath) && !efaInstances.has(instanceType))
      setEnableEFA(false)
  }

  useEffect(() => {
    if (!instanceType)
      setState(
        [...queuesPath, queueIndex, 'ComputeResources', index, 'InstanceType'],
        defaultInstanceType,
      )
  }, [queueIndex, index, instanceType])

  return (
    <div className="compute-resource">
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <ColumnLayout columns={2}>
          <h3>
            {t('wizard.queues.computeResource.name', {
              index: index + 1,
              crName: computeResource.Name,
            })}
          </h3>
          <Box margin={{top: 'xs'}} textAlign="right">
            {index > 0 && (
              <Button onClick={remove}>
                {t(
                  'wizard.queues.computeResource.removeComputeResourceButton.label',
                )}
              </Button>
            )}
          </Box>
        </ColumnLayout>
        <ColumnLayout columns={2}>
          <div style={{display: 'flex', flexDirection: 'row', gap: '20px'}}>
            <FormField label={t('wizard.queues.computeResource.staticNodes')}>
              <Input
                value={computeResource.MinCount || 0}
                type="number"
                onChange={({detail}) => setMinCount(parseInt(detail.value))}
              />
            </FormField>
            <FormField label={t('wizard.queues.computeResource.dynamicNodes')}>
              <Input
                value={Math.max(
                  (computeResource.MaxCount || 0) -
                    (computeResource.MinCount || 0),
                  0,
                ).toString()}
                type="number"
                onChange={({detail}) => setMaxCount(parseInt(detail.value))}
              />
            </FormField>
          </div>
          <FormField
            label={t('wizard.queues.computeResource.instanceType')}
            errorText={typeError}
          >
            <InstanceSelect
              path={instanceTypePath}
              callback={setInstanceType}
            />
          </FormField>
          {enableMemoryBasedScheduling && (
            <HelpTextInput
              name={t('wizard.queues.schedulableMemory.name')}
              path={path}
              errorsPath={errorsPath}
              configKey={'SchedulableMemory'}
              onChange={({detail}) =>
                setSchedulableMemory(
                  [...path, 'SchedulableMemory'],
                  detail.value,
                )
              }
              description={t('wizard.queues.schedulableMemory.description')}
              placeholder={t('wizard.queues.schedulableMemory.placeholder')}
              help={t('wizard.queues.schedulableMemory.help')}
              type="number"
            />
          )}
        </ColumnLayout>
        <SpaceBetween direction="vertical" size="s">
          <Checkbox
            disabled={
              tInstances.has(instanceType) ||
              gravitonInstances.has(instanceType)
            }
            checked={disableHT}
            onChange={_e => {
              setDisableHT(!disableHT)
            }}
            description={t(
              'wizard.queues.computeResource.disableHT.description',
            )}
          >
            <Trans i18nKey="wizard.queues.computeResource.disableHT.label" />
          </Checkbox>
          <Checkbox
            disabled={!efaInstances.has(instanceType)}
            checked={enableEFA}
            onChange={_e => {
              setEnableEFA(!enableEFA)
            }}
          >
            <Trans i18nKey="wizard.queues.computeResource.enableEfa" />
          </Checkbox>
        </SpaceBetween>
      </div>
    </div>
  )
}

export function createComputeResource(queueName: string, crIndex: number) {
  return {
    Name: `${queueName}-${defaultInstanceType.replace('.', '')}`,
    InstanceType: defaultInstanceType,
    MinCount: 0,
    MaxCount: 4,
  }
}

export function updateComputeResourcesNames(
  computeResources: SingleInstanceComputeResource[],
  newQueueName: string,
) {
  return computeResources.map(cr => ({
    ...cr,
    Name: `${newQueueName}-${cr.InstanceType.replace('.', '')}`,
  }))
}

export function validateComputeResources(
  computeResources: SingleInstanceComputeResource[],
): [boolean, QueueValidationErrors] {
  let seenInstances = new Set()
  let errors: QueueValidationErrors = {}
  let valid = true
  for (let i = 0; i < computeResources.length; i++) {
    let computeResource = computeResources[i]
    if (seenInstances.has(computeResource.InstanceType)) {
      errors[i] = 'instance_type_unique'
      valid = false
    } else {
      seenInstances.add(computeResource.InstanceType)
    }
  }
  return [valid, errors]
}

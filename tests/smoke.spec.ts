import { expect, test, type Page } from '@playwright/test'

test('loads and runs both route algorithms', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Emergency Route Planner' })).toBeVisible()
  await expect(page.getByTestId('real-route-map')).toBeVisible()
  await expect(page.getByRole('combobox')).toHaveValue('way-257897278')
  await page.getByRole('button', { name: 'Run both' }).click()

  await expect(page.getByText('Dijkstra found a route.')).toBeVisible()
  await expect(page.getByText('A* found a route.')).toBeVisible()
  await expect(page.getByText('yes')).toBeVisible()

  await page.getByRole('button', { name: 'Synthetic grid' }).click()
  await page.getByTestId('route-map').scrollIntoViewIfNeeded()
  await dragEndpointToCell(page, 1, 1, 3, 1)
  await dragEndpointToCell(page, 28, 18, 28, 17)

  await expect(page.getByText('3,1')).toBeVisible()
  await expect(page.getByText('28,17')).toBeVisible()
  await page.getByRole('button', { name: 'Run both' }).click()

  await expect(page.getByText('Dijkstra found a route.')).toBeVisible()
  await expect(page.getByText('A* found a route.')).toBeVisible()
  await expect(page.getByText('yes')).toBeVisible()
})

async function dragEndpointToCell(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  const from = await getCellCenter(page, fromX, fromY)
  const to = await getCellCenter(page, toX, toY)

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

async function getCellCenter(
  page: Page,
  x: number,
  y: number,
): Promise<{ x: number; y: number }> {
  return page.getByTestId('route-map').evaluate(
    (element, point) => {
      const svg = element as SVGSVGElement
      const matrix = svg.getScreenCTM()

      if (!matrix) {
        throw new Error('Route map screen matrix is not available.')
      }

      const svgPoint = svg.createSVGPoint()
      svgPoint.x = point.x + 0.5
      svgPoint.y = point.y + 0.5

      const screenPoint = svgPoint.matrixTransform(matrix)
      return { x: screenPoint.x, y: screenPoint.y }
    },
    { x, y },
  )
}
